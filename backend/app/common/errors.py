import logging

from werkzeug.exceptions import HTTPException

from app.common.logging import log_error
from app.common.responses import error
from app.extensions import db

logger = logging.getLogger(__name__)


def register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_error(exc: HTTPException):
        return error(exc.description or exc.name, exc.code or 500)

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc: Exception):
        db.session.rollback()
        log_error(logger, "Unhandled exception", error=str(exc))
        return error("Internal server error", 500)
