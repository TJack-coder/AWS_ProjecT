from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from app.common.errors import register_error_handlers
from app.common.logging import configure_logging
from app.common.request_context import register_request_context_hooks
from app.config import get_config
from app.extensions import db
from app.modules.books.routes import books_bp
from app.modules.monitoring.routes import monitoring_bp
from app.seeds import seed_books_if_empty

load_dotenv()


def create_app(config_object=None):
    config = config_object or get_config()
    configure_logging(getattr(config, "LOG_LEVEL", "INFO"))

    app = Flask(__name__)
    app.config.from_object(config)

    CORS(app)
    db.init_app(app)

    register_request_context_hooks(app)
    register_error_handlers(app)

    # Sprint 0 active modules.
    app.register_blueprint(monitoring_bp)
    app.register_blueprint(books_bp)

    # Temporary local/dev bootstrap. Replace with Flask-Migrate/Alembic later.
    if app.config.get("AUTO_CREATE_TABLES", True):
        with app.app_context():
            db.create_all()
            if app.config.get("SEED_SAMPLE_BOOKS", True):
                seed_books_if_empty()

    return app
