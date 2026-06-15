from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utc_now():
    return datetime.now(timezone.utc)


class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(120), nullable=False, default="General")
    description = db.Column(db.Text, nullable=True)
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
    borrow_date = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    return_date = db.Column(db.DateTime(timezone=True), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="borrowed")

    def to_dict(self):
        return {
            "id": self.id,
            "book_id": self.book_id,
            "user_id": self.user_id,
            "borrow_date": self.borrow_date.isoformat() if self.borrow_date else None,
            "return_date": self.return_date.isoformat() if self.return_date else None,
            "status": self.status,
        }
