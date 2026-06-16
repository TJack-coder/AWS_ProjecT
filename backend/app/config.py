import os
from dataclasses import dataclass

@dataclass
class BaseConfig:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL",
        "postgresql://library_user:library_password@localhost:5432/library_db",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    JSON_SORT_KEYS: bool = False

    SERVICE_NAME: str = os.getenv("SERVICE_NAME", "library-flask-api")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Keep this true in Sprint 0 to make local/dev startup simple.
    # Later, when Flask-Migrate/Alembic is added, set it to false in production.
    AUTO_CREATE_TABLES: bool = os.getenv("AUTO_CREATE_TABLES", "true").lower() == "true"
    SEED_SAMPLE_BOOKS: bool = os.getenv("SEED_SAMPLE_BOOKS", "true").lower() == "true"


@dataclass
class TestingConfig(BaseConfig):
    TESTING: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    AUTO_CREATE_TABLES: bool = True
    SEED_SAMPLE_BOOKS: bool = False


def get_config():
    env = os.getenv("FLASK_ENV", "development").lower()
    if env == "testing":
        return TestingConfig()
    return BaseConfig()
