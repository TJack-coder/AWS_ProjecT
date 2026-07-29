#!/usr/bin/env bash
set -euo pipefail

AGENT_CTL="/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl"

if [[ -x "${AGENT_CTL}" ]]; then
  echo "CloudWatch Agent is already installed."
  exit 0
fi

echo "Installing Amazon CloudWatch Agent..."
if command -v dnf >/dev/null 2>&1; then
  dnf install -y amazon-cloudwatch-agent
elif command -v yum >/dev/null 2>&1; then
  yum install -y amazon-cloudwatch-agent
else
  echo "Neither dnf nor yum is available; cannot install CloudWatch Agent." >&2
  exit 1
fi
