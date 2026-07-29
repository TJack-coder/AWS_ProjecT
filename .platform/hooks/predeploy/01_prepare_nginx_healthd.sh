#!/usr/bin/env bash
set -euo pipefail

# Create bind-mount targets before Docker Compose starts the containers.
install -d -m 0755 /var/log/nginx
install -d -m 0755 /var/log/nginx/healthd
install -d -m 0755 /var/log/aws-library
install -d -m 0775 /var/app/cloudlibrary/uploads

touch /var/log/aws-library/backend.json.log
chmod 0644 /var/log/aws-library/backend.json.log

cat > /etc/logrotate.d/aws-library <<'ROTATE'
/var/log/aws-library/backend.json.log {
    daily
    rotate 7
    size 10M
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
ROTATE

echo "Prepared Nginx healthd, application log, and upload directories."
