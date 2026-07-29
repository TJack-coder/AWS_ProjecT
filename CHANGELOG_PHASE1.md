# Phase 1 CloudWatch changes

## Modified

- `backend/app.py`
  - Measures every non-health request.
  - Emits `http_request` with method, path, status and duration.
  - Emits borrow/return success and failure event names.
- `frontend/nginx.conf`
  - Writes Nginx access/error logs to container stdout/stderr.
  - Writes Elastic Beanstalk `healthd` hourly logs.
  - Propagates `X-Request-ID` to Flask.
- `docker-compose.yml`
  - Mounts `/var/log/nginx` from the EC2 host for enhanced health.
- `DEPLOYMENT_NOTES.txt`
  - Documents observability additions.

## Added

- `.ebextensions/01-observability.config`
- `.platform/hooks/prebuild/01_install_cloudwatch_agent.sh`
- `.platform/hooks/predeploy/01_prepare_nginx_healthd.sh`
- `.platform/hooks/postdeploy/01_configure_cloudwatch_agent.sh`
- `cloudwatch/setup_phase1.sh`
- `cloudwatch/verify_phase1.sh`
- `PHASE1_CLOUDWATCH_SETUP.md`
- `CLOUDWATCH_CONSOLE_GUIDE_VI.md`
- `TEST_REPORT_PHASE1.md`
- `.gitignore`

## Preserved

- Existing login, CRUD, borrow and return behavior.
- Existing borrow-modal fix: `books={[borrowingBook]}`.
- Existing local PostgreSQL container for Sprint 0/demo.
- No real `.env` file is included in the deployment bundle.
