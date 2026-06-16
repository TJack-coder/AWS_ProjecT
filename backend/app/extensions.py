from flask_sqlalchemy import SQLAlchemy

# Centralized Flask extensions.
# Import this object anywhere that needs the database session/model base.
db = SQLAlchemy()
