import json
import logging
import os
from datetime import datetime, timezone

from flask import g, has_request_context


class JsonLogFormatter(logging.Formatter):
    """Structured JSON logs: timestamp | level | service | requestId | message."""

    def format(self, record: logging.LogRecord) -> str:
        request_id = getattr(record, "request_id", None)
        if request_id is None and has_request_context():
            request_id = getattr(g, "request_id", "unknown")

        log_payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": os.getenv("SERVICE_NAME", "library-flask-api"),
            "requestId": request_id or "system",
            "message": record.getMessage(),
        }

        extra_data = getattr(record, "extra_data", None)
        if isinstance(extra_data, dict):
            log_payload.update(extra_data)

        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_payload, ensure_ascii=False)


def configure_logging(log_level: str = "INFO") -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter())

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level)


def log_info(logger: logging.Logger, message: str, **kwargs) -> None:
    logger.info(message, extra={"extra_data": kwargs})


def log_error(logger: logging.Logger, message: str, **kwargs) -> None:
    logger.error(message, extra={"extra_data": kwargs}, exc_info=True)
