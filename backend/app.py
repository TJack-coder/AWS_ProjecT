import json
import logging
import os
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from sqlalchemy.exc import SQLAlchemyError

from models import Book, BorrowRecord, db

load_dotenv()


class JsonLogFormatter(logging.Formatter):
    """Structured JSON logs: timestamp | level | service | requestId | message."""

    def format(self, record):
        log_payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": os.getenv("SERVICE_NAME", "library-flask-api"),
            "requestId": getattr(record, "request_id", "system"),
            "message": record.getMessage(),
        }
        if hasattr(record, "extra_data"):
            log_payload.update(record.extra_data)
        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_payload, ensure_ascii=False)


def configure_logging():
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter())
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))


def create_app():
    configure_logging()

    app = Flask(__name__)
    CORS(app)

    database_url = os.getenv("DATABASE_URL", "postgresql://library_user:library_password@localhost:5432/library_db")
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JSON_SORT_KEYS"] = False

    db.init_app(app)
    logger = logging.getLogger(__name__)

    @app.before_request
    def add_request_id():
        g.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

    @app.after_request
    def attach_request_id(response):
        response.headers["X-Request-ID"] = g.get("request_id", "unknown")
        return response

    def log_info(message, **kwargs):
        logger.info(message, extra={"request_id": g.get("request_id", "system"), "extra_data": kwargs})

    def log_error(message, **kwargs):
        logger.error(message, extra={"request_id": g.get("request_id", "system"), "extra_data": kwargs}, exc_info=True)

    def seed_books_if_empty():
        if Book.query.count() > 0:
            return
        sample_books = [
            Book(
                title="Clean Code",
                author="Robert C. Martin",
                category="Programming",
                description="A handbook of agile software craftsmanship.",
                available=True,
            ),
            Book(
                title="Design Patterns",
                author="Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
                category="Software Engineering",
                description="Classic design pattern book for object-oriented software design.",
                available=True,
            ),
            Book(
                title="Python Crash Course",
                author="Eric Matthes",
                category="Programming",
                description="A practical introduction to Python programming.",
                available=True,
            ),
            Book(
                title="Database System Concepts",
                author="Abraham Silberschatz, Henry F. Korth, S. Sudarshan",
                category="Database",
                description="Foundational concepts for relational database systems.",
                available=True,
            ),
        ]
        db.session.add_all(sample_books)
        db.session.commit()
        logger.info("Seeded sample books", extra={"request_id": "system", "extra_data": {"count": len(sample_books)}})

    with app.app_context():
        db.create_all()
        seed_books_if_empty()

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"message": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        log_error("Internal server error", error=str(error))
        db.session.rollback()
        return jsonify({"message": "Internal server error"}), 500

    @app.get("/health")
    def health_check():
        return jsonify({"status": "ok", "service": "library-flask-api"})

    @app.get("/books")
    def get_books():
        books = Book.query.order_by(Book.id.asc()).all()
        log_info("Fetched books", count=len(books))
        return jsonify([book.to_dict() for book in books])

    @app.get("/books/<int:book_id>")
    def get_book(book_id):
        book = Book.query.get_or_404(book_id)
        log_info("Fetched book detail", book_id=book_id)
        return jsonify(book.to_dict(include_records=True))

    @app.post("/books")
    def create_book():
        payload = request.get_json(silent=True) or {}
        required_fields = ["title", "author"]
        missing = [field for field in required_fields if not payload.get(field)]
        if missing:
            return jsonify({"message": "Missing required fields", "fields": missing}), 400

        book = Book(
            title=payload["title"].strip(),
            author=payload["author"].strip(),
            category=payload.get("category", "General").strip() or "General",
            description=payload.get("description", "").strip(),
            available=bool(payload.get("available", True)),
        )
        db.session.add(book)
        db.session.commit()
        log_info("Created book", book_id=book.id)
        return jsonify(book.to_dict()), 201

    @app.put("/books/<int:book_id>")
    def update_book(book_id):
        book = Book.query.get_or_404(book_id)
        payload = request.get_json(silent=True) or {}

        for field in ["title", "author", "category", "description"]:
            if field in payload:
                value = payload[field]
                setattr(book, field, value.strip() if isinstance(value, str) else value)
        if "available" in payload:
            book.available = bool(payload["available"])

        db.session.commit()
        log_info("Updated book", book_id=book.id)
        return jsonify(book.to_dict())

    @app.delete("/books/<int:book_id>")
    def delete_book(book_id):
        book = Book.query.get_or_404(book_id)
        db.session.delete(book)
        db.session.commit()
        log_info("Deleted book", book_id=book_id)
        return jsonify({"message": "Book deleted successfully"})

    @app.post("/borrow")
    def borrow_book():
        payload = request.get_json(silent=True) or {}
        book_id = payload.get("book_id")
        user_id = payload.get("user_id")

        if not book_id or not user_id:
            return jsonify({"message": "book_id and user_id are required"}), 400

        try:
            book = Book.query.get(book_id)
            if not book:
                return jsonify({"message": "Book not found"}), 404
            if not book.available:
                log_info("Borrow request rejected because book is unavailable", book_id=book_id, user_id=user_id)
                return jsonify({"message": "Book is not available"}), 409

            book.available = False
            record = BorrowRecord(book_id=book.id, user_id=str(user_id), status="borrowed")
            db.session.add(record)
            db.session.commit()
            log_info("Borrow request completed", book_id=book_id, user_id=user_id, borrow_record_id=record.id)
            return jsonify({"message": "Borrow book successfully", "book": book.to_dict(), "record": record.to_dict()})
        except SQLAlchemyError as error:
            db.session.rollback()
            log_error("Borrow request failed", error=str(error), book_id=book_id, user_id=user_id)
            return jsonify({"message": "Borrow request failed"}), 500

    @app.post("/return")
    def return_book():
        payload = request.get_json(silent=True) or {}
        book_id = payload.get("book_id")
        user_id = payload.get("user_id")

        if not book_id or not user_id:
            return jsonify({"message": "book_id and user_id are required"}), 400

        try:
            book = Book.query.get(book_id)
            if not book:
                return jsonify({"message": "Book not found"}), 404

            active_record = BorrowRecord.query.filter_by(
                book_id=book.id,
                user_id=str(user_id),
                status="borrowed",
            ).order_by(BorrowRecord.borrow_date.desc()).first()

            if not active_record:
                return jsonify({"message": "No active borrow record found for this user and book"}), 409

            active_record.status = "returned"
            active_record.return_date = datetime.now(timezone.utc)
            book.available = True
            db.session.commit()
            log_info("Return request completed", book_id=book_id, user_id=user_id, borrow_record_id=active_record.id)
            return jsonify({"message": "Return book successfully", "book": book.to_dict(), "record": active_record.to_dict()})
        except SQLAlchemyError as error:
            db.session.rollback()
            log_error("Return request failed", error=str(error), book_id=book_id, user_id=user_id)
            return jsonify({"message": "Return request failed"}), 500

    @app.get("/borrow-records")
    def get_borrow_records():
        records = BorrowRecord.query.order_by(BorrowRecord.id.desc()).all()
        log_info("Fetched borrow records", count=len(records))
        return jsonify([record.to_dict() for record in records])

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_DEBUG", "false") == "true")
