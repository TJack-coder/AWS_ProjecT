import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from models import Book, BorrowRecord, User, db

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
    CORS(
        app,
        resources={r"/*": {"origins": "*"}},
        allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    database_url = os.getenv("DATABASE_URL", "postgresql://library_user:library_password@localhost:5432/library_db")
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JSON_SORT_KEYS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-me")
    app.config["JWT_EXPIRES_HOURS"] = int(os.getenv("JWT_EXPIRES_HOURS", "24"))

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

    def generate_token(user):
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.id),
            "user_id": user.id,
            "username": user.username,
            "role": user.role,
            "iat": now,
            "exp": now + timedelta(hours=app.config["JWT_EXPIRES_HOURS"]),
        }
        return jwt.encode(payload, app.config["JWT_SECRET_KEY"], algorithm="HS256")

    def get_bearer_token():
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        return auth_header.replace("Bearer ", "", 1).strip()

    def token_required(handler):
        @wraps(handler)
        def wrapper(*args, **kwargs):
            token = get_bearer_token()
            if not token:
                return jsonify({"message": "Authorization token is required"}), 401
            try:
                decoded = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
                user = User.query.get(decoded.get("user_id"))
                if not user:
                    return jsonify({"message": "User not found"}), 401
                g.current_user = user
                return handler(*args, **kwargs)
            except jwt.ExpiredSignatureError:
                return jsonify({"message": "Token has expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"message": "Invalid token"}), 401

        return wrapper

    def admin_required(handler):
        @wraps(handler)
        @token_required
        def wrapper(*args, **kwargs):
            if g.current_user.role != "admin":
                return jsonify({"message": "Admin permission is required"}), 403
            return handler(*args, **kwargs)

        return wrapper

    def normalize_role(role):
        role = (role or "user").strip().lower()
        return role if role in {"admin", "user"} else "user"

    def get_request_user_id(payload):
        """Admin may pass user_id. Normal user can only act as himself/herself."""
        if getattr(g, "current_user", None) and g.current_user.role == "admin" and payload.get("user_id"):
            return str(payload.get("user_id"))
        if getattr(g, "current_user", None):
            return str(g.current_user.id)
        return str(payload.get("user_id")) if payload.get("user_id") else None

    def ensure_dev_schema():
        """
        db.create_all() creates new tables, but does not add columns to old tables.
        This lightweight dev migration keeps existing local DBs usable after adding cover/customer fields.
        """
        inspector = inspect(db.engine)

        def column_names(table_name):
            if not inspector.has_table(table_name):
                return set()
            return {col["name"] for col in inspector.get_columns(table_name)}

        def add_column_if_missing(table_name, column_name, ddl):
            existing = column_names(table_name)
            if column_name not in existing:
                db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))
                db.session.commit()
                logger.info(
                    "Added missing database column",
                    extra={"request_id": "system", "extra_data": {"table": table_name, "column": column_name}},
                )

        add_column_if_missing("books", "cover", "cover TEXT")
        add_column_if_missing("borrow_records", "customer_name", "customer_name VARCHAR(255)")
        add_column_if_missing("borrow_records", "phone", "phone VARCHAR(20)")
        add_column_if_missing("borrow_records", "cccd", "cccd VARCHAR(20)")
        add_column_if_missing("borrow_records", "expected_return_date", "expected_return_date VARCHAR(50)")
        add_column_if_missing("borrow_records", "deposit", "deposit INTEGER")

    def seed_users_if_empty():
        if User.query.count() > 0:
            return

        admin = User(
            username=os.getenv("DEFAULT_ADMIN_USERNAME", "admin"),
            role="admin",
            full_name="System Admin",
        )
        admin.set_password(os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123"))

        normal_user = User(
            username=os.getenv("DEFAULT_USER_USERNAME", "user"),
            role="user",
            full_name="Demo User",
        )
        normal_user.set_password(os.getenv("DEFAULT_USER_PASSWORD", "user123"))

        db.session.add_all([admin, normal_user])
        db.session.commit()
        logger.info("Seeded default users", extra={"request_id": "system", "extra_data": {"count": 2}})

    def seed_books_if_needed():
        sample_books = [
            {
                "title": "Clean Code",
                "author": "Robert C. Martin",
                "category": "Programming",
                "description": "A handbook of agile software craftsmanship.",
                "cover": "https://placehold.co/300x450?text=Clean+Code",
            },
            {
                "title": "Design Patterns",
                "author": "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
                "category": "Software Engineering",
                "description": "Classic design pattern book for object-oriented software design.",
                "cover": "https://placehold.co/300x450?text=Design+Patterns",
            },
            {
                "title": "Python Crash Course",
                "author": "Eric Matthes",
                "category": "Programming",
                "description": "A practical introduction to Python programming.",
                "cover": "https://placehold.co/300x450?text=Python+Crash+Course",
            },
            {
                "title": "Database System Concepts",
                "author": "Abraham Silberschatz, Henry F. Korth, S. Sudarshan",
                "category": "Database",
                "description": "Foundational concepts for relational database systems.",
                "cover": "https://placehold.co/300x450?text=Database+System+Concepts",
            },
            {
                "title": "The Pragmatic Programmer",
                "author": "Andrew Hunt, David Thomas",
                "category": "Programming",
                "description": "Practical lessons for becoming a better software developer.",
                "cover": "https://placehold.co/300x450?text=The+Pragmatic+Programmer",
            },
            {
                "title": "Refactoring",
                "author": "Martin Fowler",
                "category": "Software Engineering",
                "description": "Improving the design of existing code.",
                "cover": "https://placehold.co/300x450?text=Refactoring",
            },
            {
                "title": "Introduction to Algorithms",
                "author": "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
                "category": "Algorithms",
                "description": "Comprehensive textbook on algorithms and data structures.",
                "cover": "https://placehold.co/300x450?text=Introduction+to+Algorithms",
            },
            {
                "title": "Fluent Python",
                "author": "Luciano Ramalho",
                "category": "Programming",
                "description": "Clear, concise, and effective Python programming techniques.",
                "cover": "https://placehold.co/300x450?text=Fluent+Python",
            },
            {
                "title": "Effective Java",
                "author": "Joshua Bloch",
                "category": "Programming",
                "description": "Best practices for writing robust Java programs.",
                "cover": "https://placehold.co/300x450?text=Effective+Java",
            },
            {
                "title": "Head First Design Patterns",
                "author": "Eric Freeman, Elisabeth Robson",
                "category": "Software Engineering",
                "description": "A visual and practical guide to design patterns.",
                "cover": "https://placehold.co/300x450?text=Head+First+Design+Patterns",
            },
            {
                "title": "Domain-Driven Design",
                "author": "Eric Evans",
                "category": "Software Architecture",
                "description": "Tackling complexity in the heart of software.",
                "cover": "https://placehold.co/300x450?text=Domain-Driven+Design",
            },
            {
                "title": "Clean Architecture",
                "author": "Robert C. Martin",
                "category": "Software Architecture",
                "description": "A craftsman's guide to software structure and design.",
                "cover": "https://placehold.co/300x450?text=Clean+Architecture",
            },
            {
                "title": "Working Effectively with Legacy Code",
                "author": "Michael C. Feathers",
                "category": "Software Engineering",
                "description": "Strategies for safely improving legacy codebases.",
                "cover": "https://placehold.co/300x450?text=Legacy+Code",
            },
            {
                "title": "You Don't Know JS Yet",
                "author": "Kyle Simpson",
                "category": "Web Development",
                "description": "Deep JavaScript concepts for web developers.",
                "cover": "https://placehold.co/300x450?text=You+Dont+Know+JS",
            },
            {
                "title": "Eloquent JavaScript",
                "author": "Marijn Haverbeke",
                "category": "Web Development",
                "description": "A modern introduction to JavaScript programming.",
                "cover": "https://placehold.co/300x450?text=Eloquent+JavaScript",
            },
            {
                "title": "Learning React",
                "author": "Alex Banks, Eve Porcello",
                "category": "Web Development",
                "description": "Modern patterns for building React applications.",
                "cover": "https://placehold.co/300x450?text=Learning+React",
            },
            {
                "title": "Node.js Design Patterns",
                "author": "Mario Casciaro, Luciano Mammino",
                "category": "Backend",
                "description": "Design and implementation patterns for Node.js applications.",
                "cover": "https://placehold.co/300x450?text=Node.js+Design+Patterns",
            },
            {
                "title": "Microservices Patterns",
                "author": "Chris Richardson",
                "category": "Software Architecture",
                "description": "Patterns for building reliable microservice systems.",
                "cover": "https://placehold.co/300x450?text=Microservices+Patterns",
            },
            {
                "title": "Building Microservices",
                "author": "Sam Newman",
                "category": "Software Architecture",
                "description": "Designing fine-grained systems for scale and autonomy.",
                "cover": "https://placehold.co/300x450?text=Building+Microservices",
            },
            {
                "title": "Release It!",
                "author": "Michael T. Nygard",
                "category": "DevOps",
                "description": "Design and deploy production-ready software.",
                "cover": "https://placehold.co/300x450?text=Release+It",
            },
            {
                "title": "Site Reliability Engineering",
                "author": "Google SRE Team",
                "category": "DevOps",
                "description": "How Google runs production systems.",
                "cover": "https://placehold.co/300x450?text=Site+Reliability+Engineering",
            },
            {
                "title": "The DevOps Handbook",
                "author": "Gene Kim, Jez Humble, Patrick Debois, John Willis",
                "category": "DevOps",
                "description": "Creating world-class agility, reliability, and security.",
                "cover": "https://placehold.co/300x450?text=The+DevOps+Handbook",
            },
            {
                "title": "Docker Deep Dive",
                "author": "Nigel Poulton",
                "category": "DevOps",
                "description": "A hands-on guide to Docker and container concepts.",
                "cover": "https://placehold.co/300x450?text=Docker+Deep+Dive",
            },
            {
                "title": "Kubernetes in Action",
                "author": "Marko Luksa",
                "category": "DevOps",
                "description": "A practical guide to deploying applications on Kubernetes.",
                "cover": "https://placehold.co/300x450?text=Kubernetes+in+Action",
            },
            {
                "title": "Terraform Up and Running",
                "author": "Yevgeniy Brikman",
                "category": "Cloud",
                "description": "Writing infrastructure as code with Terraform.",
                "cover": "https://placehold.co/300x450?text=Terraform+Up+and+Running",
            },
            {
                "title": "AWS Certified Solutions Architect Study Guide",
                "author": "Ben Piper, David Clinton",
                "category": "Cloud",
                "description": "A study guide for AWS cloud architecture concepts.",
                "cover": "https://placehold.co/300x450?text=AWS+Solutions+Architect",
            },
            {
                "title": "Cloud Native Patterns",
                "author": "Cornelia Davis",
                "category": "Cloud",
                "description": "Designing change-tolerant software for cloud platforms.",
                "cover": "https://placehold.co/300x450?text=Cloud+Native+Patterns",
            },
            {
                "title": "Designing Data-Intensive Applications",
                "author": "Martin Kleppmann",
                "category": "Database",
                "description": "The big ideas behind reliable, scalable, maintainable systems.",
                "cover": "https://placehold.co/300x450?text=Data-Intensive+Applications",
            },
            {
                "title": "SQL Antipatterns",
                "author": "Bill Karwin",
                "category": "Database",
                "description": "Avoiding common database programming mistakes.",
                "cover": "https://placehold.co/300x450?text=SQL+Antipatterns",
            },
            {
                "title": "PostgreSQL: Up and Running",
                "author": "Regina Obe, Leo Hsu",
                "category": "Database",
                "description": "A practical guide to PostgreSQL features and administration.",
                "cover": "https://placehold.co/300x450?text=PostgreSQL+Up+and+Running",
            },
            {
                "title": "Computer Networking: A Top-Down Approach",
                "author": "James F. Kurose, Keith W. Ross",
                "category": "Networking",
                "description": "Core concepts in computer networking.",
                "cover": "https://placehold.co/300x450?text=Computer+Networking",
            },
            {
                "title": "Operating System Concepts",
                "author": "Abraham Silberschatz, Peter B. Galvin, Greg Gagne",
                "category": "Computer Science",
                "description": "Foundational operating system concepts.",
                "cover": "https://placehold.co/300x450?text=Operating+System+Concepts",
            },
            {
                "title": "Computer Systems: A Programmer's Perspective",
                "author": "Randal E. Bryant, David R. O'Hallaron",
                "category": "Computer Science",
                "description": "How computer systems execute programs.",
                "cover": "https://placehold.co/300x450?text=Computer+Systems",
            },
            {
                "title": "Artificial Intelligence: A Modern Approach",
                "author": "Stuart Russell, Peter Norvig",
                "category": "Artificial Intelligence",
                "description": "A broad introduction to modern AI concepts.",
                "cover": "https://placehold.co/300x450?text=Artificial+Intelligence",
            },
            {
                "title": "Hands-On Machine Learning",
                "author": "Aurélien Géron",
                "category": "Artificial Intelligence",
                "description": "Machine learning with Scikit-Learn, Keras, and TensorFlow.",
                "cover": "https://placehold.co/300x450?text=Hands-On+Machine+Learning",
            },
            {
                "title": "Deep Learning",
                "author": "Ian Goodfellow, Yoshua Bengio, Aaron Courville",
                "category": "Artificial Intelligence",
                "description": "A comprehensive introduction to deep learning.",
                "cover": "https://placehold.co/300x450?text=Deep+Learning",
            },
            {
                "title": "Pattern Recognition and Machine Learning",
                "author": "Christopher M. Bishop",
                "category": "Artificial Intelligence",
                "description": "Probabilistic modeling and machine learning foundations.",
                "cover": "https://placehold.co/300x450?text=Pattern+Recognition",
            },
            {
                "title": "The Mythical Man-Month",
                "author": "Frederick P. Brooks Jr.",
                "category": "Software Engineering",
                "description": "Essays on software engineering and project management.",
                "cover": "https://placehold.co/300x450?text=Mythical+Man-Month",
            },
            {
                "title": "Peopleware",
                "author": "Tom DeMarco, Timothy Lister",
                "category": "Project Management",
                "description": "Productive projects and teams in software development.",
                "cover": "https://placehold.co/300x450?text=Peopleware",
            },
            {
                "title": "The Phoenix Project",
                "author": "Gene Kim, Kevin Behr, George Spafford",
                "category": "DevOps",
                "description": "A novel about IT, DevOps, and helping your business win.",
                "cover": "https://placehold.co/300x450?text=The+Phoenix+Project",
            },
        ]

        existing_titles = {title for (title,) in db.session.query(Book.title).all()}
        new_books = []
        updated_count = 0

        for item in sample_books:
            existing = Book.query.filter_by(title=item["title"]).first()
            if not existing:
                new_books.append(Book(**item, available=True))
            elif not existing.cover:
                existing.cover = item["cover"]
                updated_count += 1

        if new_books:
            db.session.add_all(new_books)
        if new_books or updated_count:
            db.session.commit()
            logger.info(
                "Seeded/updated sample books",
                extra={"request_id": "system", "extra_data": {"inserted": len(new_books), "updated": updated_count}},
            )

    with app.app_context():
        db.create_all()
        try:
            ensure_dev_schema()
        except SQLAlchemyError as error:
            db.session.rollback()
            logger.warning(
                "Could not auto-update existing schema. You may need to reset the local DB or run migrations.",
                extra={"request_id": "system", "extra_data": {"error": str(error)}},
            )
        seed_users_if_empty()
        seed_books_if_needed()

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

    @app.post("/auth/register")
    def register():
        payload = request.get_json(silent=True) or {}
        username = (payload.get("username") or "").strip()
        password = payload.get("password") or ""

        if not username or not password:
            return jsonify({"message": "username and password are required"}), 400
        if len(password) < 6:
            return jsonify({"message": "Password must be at least 6 characters"}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({"message": "Username already exists"}), 409

        user = User(
            username=username,
            role="user",
            full_name=(payload.get("fullName") or payload.get("full_name") or "").strip() or None,
            phone=(payload.get("phone") or "").strip() or None,
            cccd=(payload.get("cccd") or "").strip() or None,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        token = generate_token(user)
        log_info("Registered user", user_id=user.id, username=user.username)
        return jsonify({"message": "Register successfully", "access_token": token, "token_type": "Bearer", "user": user.to_dict()}), 201

    @app.post("/auth/login")
    def login():
        payload = request.get_json(silent=True) or {}
        username = (payload.get("username") or "").strip()
        password = payload.get("password") or ""

        if not username or not password:
            return jsonify({"message": "username and password are required"}), 400

        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({"message": "Invalid username or password"}), 401

        token = generate_token(user)
        log_info("Login completed", user_id=user.id, username=user.username, role=user.role)
        return jsonify({"message": "Login successfully", "access_token": token, "token_type": "Bearer", "user": user.to_dict()})

    @app.get("/auth/me")
    @token_required
    def me():
        return jsonify(g.current_user.to_dict())

    @app.get("/users")
    @admin_required
    def get_users():
        users = User.query.order_by(User.id.asc()).all()
        log_info("Fetched users", count=len(users))
        return jsonify([user.to_dict() for user in users])

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
    @admin_required
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
            cover=(payload.get("cover") or "").strip() or None,
            available=bool(payload.get("available", True)),
        )
        db.session.add(book)
        db.session.commit()
        log_info("Created book", book_id=book.id, admin_id=g.current_user.id)
        return jsonify(book.to_dict()), 201

    @app.put("/books/<int:book_id>")
    @admin_required
    def update_book(book_id):
        book = Book.query.get_or_404(book_id)
        payload = request.get_json(silent=True) or {}

        for field in ["title", "author", "category", "description", "cover"]:
            if field in payload:
                value = payload[field]
                setattr(book, field, value.strip() if isinstance(value, str) else value)
        if "available" in payload:
            book.available = bool(payload["available"])

        db.session.commit()
        log_info("Updated book", book_id=book.id, admin_id=g.current_user.id)
        return jsonify(book.to_dict())

    @app.delete("/books/<int:book_id>")
    @admin_required
    def delete_book(book_id):
        book = Book.query.get_or_404(book_id)
        db.session.delete(book)
        db.session.commit()
        log_info("Deleted book", book_id=book_id, admin_id=g.current_user.id)
        return jsonify({"message": "Book deleted successfully"})

    @app.post("/borrow")
    @token_required
    def borrow_book():
        payload = request.get_json(silent=True) or {}
        book_id = payload.get("book_id") or payload.get("bookId")
        user_id = get_request_user_id(payload)

        if not book_id:
            return jsonify({"message": "book_id is required"}), 400
        if not user_id:
            return jsonify({"message": "user_id is required"}), 400

        try:
            book = Book.query.get(book_id)
            if not book:
                return jsonify({"message": "Book not found"}), 404
            if not book.available:
                log_info("Borrow request rejected because book is unavailable", book_id=book_id, user_id=user_id)
                return jsonify({"message": "Book is not available"}), 409

            book.available = False
            record = BorrowRecord(
                book_id=book.id,
                user_id=str(user_id),
                customer_name=payload.get("customerName") or payload.get("customer_name") or g.current_user.full_name,
                phone=payload.get("phone") or g.current_user.phone,
                cccd=payload.get("cccd") or g.current_user.cccd,
                expected_return_date=payload.get("returnDate") or payload.get("expectedReturnDate"),
                deposit=payload.get("deposit", 150000),
                status="active",
            )
            db.session.add(record)
            db.session.commit()
            log_info("Borrow request completed", book_id=book_id, user_id=user_id, borrow_record_id=record.id)
            return jsonify({"message": "Borrow book successfully", "book": book.to_dict(), "record": record.to_dict()})
        except SQLAlchemyError as error:
            db.session.rollback()
            log_error("Borrow request failed", error=str(error), book_id=book_id, user_id=user_id)
            return jsonify({"message": "Borrow request failed"}), 500

    @app.post("/return")
    @token_required
    def return_book():
        payload = request.get_json(silent=True) or {}
        book_id = payload.get("book_id") or payload.get("bookId")
        record_id = payload.get("record_id") or payload.get("recordId")
        user_id = get_request_user_id(payload)

        if not book_id and not record_id:
            return jsonify({"message": "book_id or record_id is required"}), 400

        try:
            active_record = None
            if record_id:
                active_record = BorrowRecord.query.get(record_id)
                if active_record and g.current_user.role != "admin" and active_record.user_id != str(g.current_user.id):
                    return jsonify({"message": "You can only return your own borrow record"}), 403
            else:
                filters = [
                    BorrowRecord.book_id == int(book_id),
                    BorrowRecord.status.in_(["active", "borrowed"]),
                ]
                if g.current_user.role != "admin":
                    filters.append(BorrowRecord.user_id == str(g.current_user.id))
                elif user_id:
                    filters.append(BorrowRecord.user_id == str(user_id))

                active_record = BorrowRecord.query.filter(*filters).order_by(BorrowRecord.borrow_date.desc()).first()

            if not active_record:
                return jsonify({"message": "No active borrow record found"}), 409
            if active_record.status == "returned":
                return jsonify({"message": "This book has already been returned"}), 409

            book = Book.query.get(active_record.book_id)
            if not book:
                return jsonify({"message": "Book not found"}), 404

            active_record.status = "returned"
            active_record.return_date = datetime.now(timezone.utc)
            book.available = True
            db.session.commit()
            log_info("Return request completed", book_id=book.id, user_id=active_record.user_id, borrow_record_id=active_record.id)
            return jsonify({"message": "Return book successfully", "book": book.to_dict(), "record": active_record.to_dict()})
        except SQLAlchemyError as error:
            db.session.rollback()
            log_error("Return request failed", error=str(error), book_id=book_id, record_id=record_id)
            return jsonify({"message": "Return request failed"}), 500

    @app.get("/borrow-records")
    @admin_required
    def get_borrow_records():
        records = BorrowRecord.query.order_by(BorrowRecord.id.desc()).all()
        log_info("Fetched borrow records", count=len(records), admin_id=g.current_user.id)
        return jsonify([record.to_dict() for record in records])

    @app.get("/my-borrow-records")
    @token_required
    def get_my_borrow_records():
        records = BorrowRecord.query.filter_by(user_id=str(g.current_user.id)).order_by(BorrowRecord.id.desc()).all()
        log_info("Fetched my borrow records", count=len(records), user_id=g.current_user.id)
        return jsonify([record.to_dict() for record in records])

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_DEBUG", "false") == "true")
