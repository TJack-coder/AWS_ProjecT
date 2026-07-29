#!/usr/bin/env bash
set -euo pipefail

AGENT_CTL="/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl"
CONFIG_FILE="/opt/aws/amazon-cloudwatch-agent/etc/aws-library-cloudwatch-agent.json"

if [[ ! -x "${AGENT_CTL}" ]]; then
  echo "CloudWatch Agent control script was not found at ${AGENT_CTL}." >&2
  exit 1
fi

cat > "${CONFIG_FILE}" <<'JSON'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "namespace": "AWSLibrary/System",
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}",
      "AutoScalingGroupName": "${aws:AutoScalingGroupName}"
    },
    "aggregation_dimensions": [
      ["AutoScalingGroupName"],
      ["InstanceId"]
    ],
    "metrics_collected": {
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "resources": [
          "/"
        ],
        "drop_device": true,
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/aws-library/backend.json.log",
            "log_group_name": "/aws/aws-library/application",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
JSON

"${AGENT_CTL}" \
  -a append-config \
  -m ec2 \
  -s \
  -c "file:${CONFIG_FILE}"

# Match the official Elastic Beanstalk Docker Compose healthd setup: the
# Nginx worker must be able to create hourly files in the host bind mount.
NGINX_CONTAINER="$(
  docker ps \
    --filter 'label=com.docker.compose.service=frontend' \
    --format '{{.ID}}' \
    | head -n 1
)"

if [[ -z "${NGINX_CONTAINER}" ]]; then
  echo "Could not find the running frontend Nginx container." >&2
  exit 1
fi

NGINX_UID="$(docker exec "${NGINX_CONTAINER}" id -u nginx)"
NGINX_GID="$(docker exec "${NGINX_CONTAINER}" id -g nginx)"
chown -R "${NGINX_UID}:${NGINX_GID}" /var/log/nginx
chmod 0755 /var/log/nginx /var/log/nginx/healthd
find /var/log/nginx/healthd -type f -exec chmod 0644 {} + 2>/dev/null || true

echo "CloudWatch Agent configured; Nginx healthd permissions prepared."
