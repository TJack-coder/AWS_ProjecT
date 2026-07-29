#!/usr/bin/env bash
set -euo pipefail

# One-time AWS account setup for Phase 1 observability.
# Run from AWS CloudShell after deploying this source bundle.

AWS_REGION="${AWS_REGION:-ap-southeast-2}"
EB_ENVIRONMENT="${EB_ENVIRONMENT:-Aws-library-system-env}"
EB_EC2_ROLE="${EB_EC2_ROLE:-aws-elasticbeanstalk-ec2-role}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DASHBOARD_NAME="${DASHBOARD_NAME:-AWS-Library-System}"
METRIC_NAMESPACE="${METRIC_NAMESPACE:-AWSLibrary}"
SYSTEM_NAMESPACE="${SYSTEM_NAMESPACE:-AWSLibrary/System}"
APP_LOG_GROUP="${APP_LOG_GROUP:-/aws/aws-library/application}"
SNS_TOPIC_ARN="${SNS_TOPIC_ARN:-}"

ALARM_ACTIONS=()
if [[ -n "${SNS_TOPIC_ARN}" ]]; then
  ALARM_ACTIONS=(--alarm-actions "${SNS_TOPIC_ARN}" --ok-actions "${SNS_TOPIC_ARN}")
fi

export AWS_PAGER=""

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command aws
require_command python3

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text --region "${AWS_REGION}")"
echo "AWS account: ${ACCOUNT_ID}"
echo "Region: ${AWS_REGION}"
echo "Elastic Beanstalk environment: ${EB_ENVIRONMENT}"

# CloudWatch Agent publishes memory/disk metrics through the EC2 instance role.
echo "Attaching CloudWatchAgentServerPolicy to ${EB_EC2_ROLE} (idempotent)..."
aws iam attach-role-policy \
  --role-name "${EB_EC2_ROLE}" \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

# Source-bundle settings already enable these options. Re-applying here makes
# the script useful even if the previous application version omitted them.
echo "Enabling enhanced health and CloudWatch log streaming..."
aws elasticbeanstalk update-environment \
  --environment-name "${EB_ENVIRONMENT}" \
  --region "${AWS_REGION}" \
  --option-settings \
    Namespace=aws:elasticbeanstalk:healthreporting:system,OptionName=SystemType,Value=enhanced \
    Namespace=aws:elasticbeanstalk:cloudwatch:logs,OptionName=StreamLogs,Value=true \
    Namespace=aws:elasticbeanstalk:cloudwatch:logs,OptionName=DeleteOnTerminate,Value=false \
    Namespace=aws:elasticbeanstalk:cloudwatch:logs,OptionName=RetentionInDays,Value="${RETENTION_DAYS}" \
    Namespace=aws:elasticbeanstalk:cloudwatch:logs:health,OptionName=HealthStreamingEnabled,Value=true \
    Namespace=aws:elasticbeanstalk:cloudwatch:logs:health,OptionName=DeleteOnTerminate,Value=false \
    Namespace=aws:elasticbeanstalk:cloudwatch:logs:health,OptionName=RetentionInDays,Value="${RETENTION_DAYS}" \
    Namespace=aws:autoscaling:launchconfiguration,OptionName=MonitoringInterval,Value="5 minute" \
  >/dev/null

# Wait if the AWS CLI provides this waiter; otherwise continue and the user can
# rerun the script after the environment becomes Ready.
aws elasticbeanstalk wait environment-updated \
  --environment-names "${EB_ENVIRONMENT}" \
  --region "${AWS_REGION}" 2>/dev/null || true

# The unified CloudWatch Agent writes the backend JSON file to this custom
# log group. Create it first so metric filters can be installed immediately.
if ! aws logs describe-log-groups \
  --log-group-name-prefix "${APP_LOG_GROUP}" \
  --region "${AWS_REGION}" \
  --query 'logGroups[].logGroupName' \
  --output text | tr '\t' '\n' | grep -Fxq "${APP_LOG_GROUP}"; then
  echo "Creating log group ${APP_LOG_GROUP}..."
  aws logs create-log-group \
    --log-group-name "${APP_LOG_GROUP}" \
    --region "${AWS_REGION}"
fi

aws logs put-retention-policy \
  --log-group-name "${APP_LOG_GROUP}" \
  --retention-in-days "${RETENTION_DAYS}" \
  --region "${AWS_REGION}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

put_filter() {
  local filter_name="$1"
  local filter_pattern="$2"
  local metric_name="$3"
  local metric_value="$4"
  local unit="$5"
  local default_value="${6:-}"
  local transform_file="${TMP_DIR}/${filter_name}.json"

  python3 - "${metric_name}" "${METRIC_NAMESPACE}" "${metric_value}" "${unit}" "${default_value}" > "${transform_file}" <<'PY'
import json
import sys
metric_name, namespace, metric_value, unit, default_value = sys.argv[1:]
item = {
    "metricName": metric_name,
    "metricNamespace": namespace,
    "metricValue": metric_value,
    "unit": unit,
}
if default_value:
    item["defaultValue"] = float(default_value)
print(json.dumps([item]))
PY

  aws logs put-metric-filter \
    --log-group-name "${APP_LOG_GROUP}" \
    --filter-name "${filter_name}" \
    --filter-pattern "${filter_pattern}" \
    --metric-transformations "file://${transform_file}" \
    --region "${AWS_REGION}"
}

echo "Creating CloudWatch Logs metric filters..."
put_filter \
  AWSLibraryBorrowSuccess \
  '{ $.event = "borrow_success" }' \
  BorrowCount 1 Count 0

put_filter \
  AWSLibraryRequestCount \
  '{ $.event = "http_request" && $.path != "/health" }' \
  RequestCount 1 Count 0

put_filter \
  AWSLibraryHttp5xx \
  '{ $.event = "http_request" && $.status_code >= 500 }' \
  Http5xxCount 1 Count 0

# Do not set a default value for latency because synthetic zeroes would distort p95.
put_filter \
  AWSLibraryRequestLatency \
  '{ $.event = "http_request" && $.duration_ms = * }' \
  RequestLatencyMs '$.duration_ms' Milliseconds

INSTANCE_ID="$(aws elasticbeanstalk describe-environment-resources \
  --environment-name "${EB_ENVIRONMENT}" \
  --region "${AWS_REGION}" \
  --query 'EnvironmentResources.Instances[0].Id' \
  --output text)"

if [[ -z "${INSTANCE_ID}" || "${INSTANCE_ID}" == "None" ]]; then
  echo "Could not find the current EC2 instance for ${EB_ENVIRONMENT}." >&2
  exit 1
fi

ASG_NAME="$(aws elasticbeanstalk describe-environment-resources \
  --environment-name "${EB_ENVIRONMENT}" \
  --region "${AWS_REGION}" \
  --query 'EnvironmentResources.AutoScalingGroups[0].Name' \
  --output text)"

if [[ -z "${ASG_NAME}" || "${ASG_NAME}" == "None" ]]; then
  echo "Could not find the Auto Scaling group for ${EB_ENVIRONMENT}." >&2
  exit 1
fi

echo "Current EC2 instance: ${INSTANCE_ID}"
echo "Auto Scaling group: ${ASG_NAME}"

# CPU alarm follows the stable Auto Scaling group rather than one replaceable instance.
aws cloudwatch put-metric-alarm \
  --alarm-name aws-library-high-cpu \
  --alarm-description "Elastic Beanstalk EC2 CPU average is above 80 percent." \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value="${ASG_NAME}" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --datapoints-to-alarm 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  "${ALARM_ACTIONS[@]}" \
  --region "${AWS_REGION}"

# Memory alarm from the CloudWatch Agent installed by platform hooks.
aws cloudwatch put-metric-alarm \
  --alarm-name aws-library-high-memory \
  --alarm-description "EC2 memory usage is above 85 percent." \
  --namespace "${SYSTEM_NAMESPACE}" \
  --metric-name mem_used_percent \
  --dimensions Name=AutoScalingGroupName,Value="${ASG_NAME}" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --datapoints-to-alarm 2 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  "${ALARM_ACTIONS[@]}" \
  --region "${AWS_REGION}"

# p95 latency alarm.
aws cloudwatch put-metric-alarm \
  --alarm-name aws-library-high-latency \
  --alarm-description "Application p95 latency is above 1000 ms." \
  --namespace "${METRIC_NAMESPACE}" \
  --metric-name RequestLatencyMs \
  --extended-statistic p95 \
  --period 300 \
  --evaluation-periods 3 \
  --datapoints-to-alarm 2 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  "${ALARM_ACTIONS[@]}" \
  --region "${AWS_REGION}"

# Error-rate alarm: 100 * 5xx / requests.
python3 - "${METRIC_NAMESPACE}" > "${TMP_DIR}/error-rate-metrics.json" <<'PY'
import json
import sys
namespace = sys.argv[1]
queries = [
    {
        "Id": "m1",
        "MetricStat": {
            "Metric": {"Namespace": namespace, "MetricName": "Http5xxCount"},
            "Period": 300,
            "Stat": "Sum",
        },
        "ReturnData": False,
    },
    {
        "Id": "m2",
        "MetricStat": {
            "Metric": {"Namespace": namespace, "MetricName": "RequestCount"},
            "Period": 300,
            "Stat": "Sum",
        },
        "ReturnData": False,
    },
    {
        "Id": "e1",
        "Expression": "IF(m2>0,100*m1/m2,0)",
        "Label": "ErrorRatePercent",
        "ReturnData": True,
    },
]
print(json.dumps(queries))
PY

aws cloudwatch put-metric-alarm \
  --alarm-name aws-library-error-rate \
  --alarm-description "HTTP 5xx error rate is above 5 percent." \
  --metrics "file://${TMP_DIR}/error-rate-metrics.json" \
  --evaluation-periods 2 \
  --datapoints-to-alarm 2 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  "${ALARM_ACTIONS[@]}" \
  --region "${AWS_REGION}"

# Dashboard containing the required system and application views.
python3 - "${AWS_REGION}" "${EB_ENVIRONMENT}" "${ASG_NAME}" "${METRIC_NAMESPACE}" "${SYSTEM_NAMESPACE}" > "${TMP_DIR}/dashboard.json" <<'PY'
import json
import sys
region, environment, asg_name, app_ns, system_ns = sys.argv[1:]
body = {
    "start": "-PT6H",
    "periodOverride": "inherit",
    "widgets": [
        {
            "type": "metric", "x": 0, "y": 0, "width": 12, "height": 6,
            "properties": {
                "title": "EC2 CPU and memory",
                "region": region,
                "period": 300,
                "stat": "Average",
                "metrics": [
                    ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", asg_name, {"label": "CPU %"}],
                    [system_ns, "mem_used_percent", "AutoScalingGroupName", asg_name, {"label": "Memory %"}],
                ],
                "yAxis": {"left": {"min": 0, "max": 100}}
            }
        },
        {
            "type": "metric", "x": 12, "y": 0, "width": 12, "height": 6,
            "properties": {
                "title": "Elastic Beanstalk environment health",
                "region": region,
                "period": 300,
                "stat": "Average",
                "metrics": [
                    ["AWS/ElasticBeanstalk", "EnvironmentHealth", "EnvironmentName", environment]
                ]
            }
        },
        {
            "type": "metric", "x": 0, "y": 6, "width": 12, "height": 6,
            "properties": {
                "title": "Application traffic",
                "region": region,
                "period": 300,
                "stat": "Sum",
                "metrics": [
                    [app_ns, "RequestCount", {"label": "Requests"}],
                    [app_ns, "BorrowCount", {"label": "Successful borrows"}],
                    [app_ns, "Http5xxCount", {"label": "HTTP 5xx"}],
                ]
            }
        },
        {
            "type": "metric", "x": 12, "y": 6, "width": 12, "height": 6,
            "properties": {
                "title": "Request latency p95",
                "region": region,
                "period": 300,
                "stat": "p95",
                "metrics": [
                    [app_ns, "RequestLatencyMs", {"label": "p95 latency (ms)"}]
                ]
            }
        },
        {
            "type": "metric", "x": 0, "y": 12, "width": 24, "height": 6,
            "properties": {
                "title": "HTTP 5xx error rate",
                "region": region,
                "period": 300,
                "metrics": [
                    [{"expression": "IF(m2>0,100*m1/m2,0)", "label": "Error rate %", "id": "e1"}],
                    [app_ns, "Http5xxCount", {"id": "m1", "stat": "Sum", "visible": False}],
                    [app_ns, "RequestCount", {"id": "m2", "stat": "Sum", "visible": False}],
                ],
                "yAxis": {"left": {"min": 0}}
            }
        },
        {
            "type": "log", "x": 0, "y": 18, "width": 24, "height": 7,
            "properties": {
                "title": "Top API paths and average latency",
                "region": region,
                "view": "table",
                "query": "SOURCE '/aws/aws-library/application' | fields path, duration_ms, status_code | filter event = 'http_request' and path != '/health' | stats count(*) as requests, avg(duration_ms) as avg_ms, pct(duration_ms, 95) as p95_ms by path | sort requests desc | limit 20"
            }
        }
    ]
}
print(json.dumps(body))
PY

aws cloudwatch put-dashboard \
  --dashboard-name "${DASHBOARD_NAME}" \
  --dashboard-body "file://${TMP_DIR}/dashboard.json" \
  --region "${AWS_REGION}"

echo
echo "Phase 1 AWS setup completed."
echo "Log group: ${APP_LOG_GROUP}"
echo "Dashboard: ${DASHBOARD_NAME}"
echo "Alarms: aws-library-high-cpu, aws-library-high-memory, aws-library-high-latency, aws-library-error-rate"
if [[ -n "${SNS_TOPIC_ARN}" ]]; then
  echo "SNS notifications: ${SNS_TOPIC_ARN}"
else
  echo "SNS notifications: disabled (set SNS_TOPIC_ARN to enable email/SMS actions)"
fi
echo
echo "Generate fresh traffic now: login, open books, borrow, and return."
echo "Metric filters only transform log events ingested after the filters were created."
