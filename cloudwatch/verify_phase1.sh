#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-southeast-2}"
EB_ENVIRONMENT="${EB_ENVIRONMENT:-Aws-library-system-env}"
DASHBOARD_NAME="${DASHBOARD_NAME:-AWS-Library-System}"
APP_LOG_GROUP="${APP_LOG_GROUP:-/aws/aws-library/application}"

export AWS_PAGER=""

printf '\n== Elastic Beanstalk ==\n'
aws elasticbeanstalk describe-environments \
  --environment-names "${EB_ENVIRONMENT}" \
  --region "${AWS_REGION}" \
  --query 'Environments[0].{Status:Status,Health:Health,HealthStatus:HealthStatus,Version:VersionLabel}' \
  --output table

printf '\n== Application log group ==\n'
aws logs describe-log-groups \
  --log-group-name-prefix "${APP_LOG_GROUP}" \
  --region "${AWS_REGION}" \
  --query 'logGroups[].{Name:logGroupName,Retention:retentionInDays,Bytes:storedBytes}' \
  --output table

printf '\n== Metric filters ==\n'
aws logs describe-metric-filters \
  --log-group-name "${APP_LOG_GROUP}" \
  --region "${AWS_REGION}" \
  --query 'metricFilters[].{Filter:filterName,Pattern:filterPattern,Metric:metricTransformations[0].metricName}' \
  --output table

printf '\n== CloudWatch alarms ==\n'
aws cloudwatch describe-alarms \
  --alarm-name-prefix aws-library- \
  --region "${AWS_REGION}" \
  --query 'MetricAlarms[].{Alarm:AlarmName,State:StateValue,Reason:StateReason}' \
  --output table

printf '\n== Dashboard ==\n'
aws cloudwatch list-dashboards \
  --dashboard-name-prefix "${DASHBOARD_NAME}" \
  --region "${AWS_REGION}" \
  --query 'DashboardEntries[].{Name:DashboardName,Modified:LastModified}' \
  --output table

printf '\n== Recent structured application events ==\n'
START_TIME="$(( ($(date +%s) - 3600) * 1000 ))"
aws logs filter-log-events \
  --log-group-name "${APP_LOG_GROUP}" \
  --start-time "${START_TIME}" \
  --filter-pattern '{ $.service = "library-flask-api" }' \
  --limit 20 \
  --region "${AWS_REGION}" \
  --query 'events[].message' \
  --output text || true

printf '\nVerification finished. Generate login/borrow/return traffic if metrics still show no data.\n'
