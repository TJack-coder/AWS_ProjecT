from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash


db = SQLAlchemy()


def utc_now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="user")  # admin | user
    full_name = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    cccd = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "fullName": self.full_name,
            "phone": self.phone,
            "cccd": self.cccd,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(120), nullable=False, default="General")
    description = db.Column(db.Text, nullable=True)
    cover = db.Column(db.Text, nullable=True)
    available = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    borrow_records = db.relationship(
        "BorrowRecord",
        backref="book",
        cascade="all, delete-orphan",
        lazy=True,
    )

    def to_dict(self, include_records=False):
        data = {
            "id": self.id,
            "title": self.title,
            "author": self.author,
            "category": self.category,
            "description": self.description,
            "cover": self.cover,
            "available": self.available,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_records:
            data["borrow_records"] = [record.to_dict() for record in self.borrow_records]
        return data


class BorrowRecord(db.Model):
    __tablename__ = "borrow_records"

    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id"), nullable=False)
    user_id = db.Column(db.String(100), nullable=False)

    customer_name = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    cccd = db.Column(db.String(20), nullable=True)
    expected_return_date = db.Column(db.String(50), nullable=True)
    deposit = db.Column(db.Integer, nullable=True)

    borrow_date = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    return_date = db.Column(db.DateTime(timezone=True), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="active")  # active | returned

    def to_dict(self):
        return {
            "id": self.id,
            "book_id": self.book_id,
            "user_id": self.user_id,
            "customerName": self.customer_name,
            "phone": self.phone,
            "cccd": self.cccd,
            "expectedReturnDate": self.expected_return_date,
            "deposit": self.deposit,
            "borrow_date": self.borrow_date.isoformat() if self.borrow_date else None,
            "return_date": self.return_date.isoformat() if self.return_date else None,
            "status": self.status,
            "bookTitle": self.book.title if self.book else "Sách không xác định",
        }
