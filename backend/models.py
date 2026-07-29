from datetime import date, datetime, timezone
import json

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash


db = SQLAlchemy()


def utc_now():
    return datetime.now(timezone.utc)


def parse_iso_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def mask_phone(value):
    if not value:
        return None
    text = str(value)
    if len(text) <= 4:
        return "*" * len(text)
    return f"{text[:3]}****{text[-3:]}"


def mask_identity(value):
    if not value:
        return None
    text = str(value)
    if len(text) <= 4:
        return "*" * len(text)
    return f"{'*' * (len(text) - 4)}{text[-4:]}"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="user")
    full_name = db.Column(db.String(255), nullable=True)
    email = db.Column(db.String(255), nullable=True, index=True)
    phone = db.Column(db.String(20), nullable=True)
    cccd = db.Column(db.String(20), nullable=True)
    avatar = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    failed_login_attempts = db.Column(db.Integer, nullable=False, default=0)
    locked_until = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def is_locked(self):
        if not self.locked_until:
            return False
        current = datetime.now(timezone.utc)
        locked_until = self.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        return locked_until > current

    def to_dict(self, reveal_sensitive=False):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "fullName": self.full_name,
            "email": self.email,
            "phone": self.phone if reveal_sensitive else mask_phone(self.phone),
            "cccd": self.cccd if reveal_sensitive else mask_identity(self.cccd),
            "avatar": self.avatar,
            "isActive": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False, index=True)
    author = db.Column(db.String(255), nullable=False, index=True)
    category = db.Column(db.String(120), nullable=False, default="General", index=True)
    description = db.Column(db.Text, nullable=True)
    cover = db.Column(db.Text, nullable=True)
    isbn = db.Column(db.String(32), nullable=True, index=True)
    publisher = db.Column(db.String(180), nullable=True)
    publication_year = db.Column(db.Integer, nullable=True)
    shelf_location = db.Column(db.String(80), nullable=True)
    total_quantity = db.Column(db.Integer, nullable=False, default=1)
    available_quantity = db.Column(db.Integer, nullable=False, default=1)
    available = db.Column(db.Boolean, nullable=False, default=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    borrow_count = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    borrow_records = db.relationship("BorrowRecord", backref="book", lazy=True)
    reservations = db.relationship("Reservation", backref="book", lazy=True)

    @property
    def borrowed_quantity(self):
        return max(0, int(self.total_quantity or 0) - int(self.available_quantity or 0))

    def sync_availability(self):
        total = max(0, int(self.total_quantity or 0))
        available = max(0, min(total, int(self.available_quantity or 0)))
        self.total_quantity = total
        self.available_quantity = available
        self.available = self.is_active and available > 0

    def to_dict(self, include_records=False):
        self.sync_availability()
        active_reservations = [r for r in self.reservations if r.status in {"waiting", "notified"}]
        data = {
            "id": self.id,
            "title": self.title,
            "author": self.author,
            "category": self.category,
            "description": self.description,
            "cover": self.cover,
            "isbn": self.isbn,
            "publisher": self.publisher,
            "publicationYear": self.publication_year,
            "shelfLocation": self.shelf_location,
            "totalQuantity": self.total_quantity,
            "availableQuantity": self.available_quantity,
            "borrowedQuantity": self.borrowed_quantity,
            "available": self.available,
            "isActive": self.is_active,
            "borrowCount": self.borrow_count,
            "reservationCount": len(active_reservations),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_records:
            data["borrow_records"] = [record.to_dict() for record in self.borrow_records]
        return data


class BorrowRecord(db.Model):
    __tablename__ = "borrow_records"

    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id"), nullable=False, index=True)
    user_id = db.Column(db.String(100), nullable=False, index=True)
    customer_name = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    cccd = db.Column(db.String(20), nullable=True)
    expected_return_date = db.Column(db.String(50), nullable=True)
    deposit = db.Column(db.Integer, nullable=True)
    borrow_date = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    return_date = db.Column(db.DateTime(timezone=True), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="active", index=True)
    renew_count = db.Column(db.Integer, nullable=False, default=0)
    last_renewed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    renewal_status = db.Column(db.String(30), nullable=False, default="none")
    renewal_requested_at = db.Column(db.DateTime(timezone=True), nullable=True)
    return_requested_at = db.Column(db.DateTime(timezone=True), nullable=True)
    return_condition = db.Column(db.String(30), nullable=True)
    fine_amount = db.Column(db.Integer, nullable=False, default=0)
    admin_note = db.Column(db.Text, nullable=True)
    approved_by = db.Column(db.Integer, nullable=True)

    def due_date(self):
        return parse_iso_date(self.expected_return_date)

    def is_overdue(self):
        due = self.due_date()
        return bool(self.status in {"active", "return_requested"} and due and due < date.today())

    def days_remaining(self):
        due = self.due_date()
        if not due or self.status not in {"active", "return_requested"}:
            return None
        return (due - date.today()).days

    def to_dict(self, reveal_sensitive=False):
        return {
            "id": self.id,
            "book_id": self.book_id,
            "bookId": self.book_id,
            "user_id": self.user_id,
            "userId": self.user_id,
            "customerName": self.customer_name,
            "phone": self.phone if reveal_sensitive else mask_phone(self.phone),
            "cccd": self.cccd if reveal_sensitive else mask_identity(self.cccd),
            "expectedReturnDate": self.expected_return_date,
            "deposit": self.deposit,
            "borrow_date": self.borrow_date.isoformat() if self.borrow_date else None,
            "return_date": self.return_date.isoformat() if self.return_date else None,
            "status": self.status,
            "renewCount": self.renew_count,
            "renewalStatus": self.renewal_status,
            "renewalRequestedAt": self.renewal_requested_at.isoformat() if self.renewal_requested_at else None,
            "returnRequestedAt": self.return_requested_at.isoformat() if self.return_requested_at else None,
            "returnCondition": self.return_condition,
            "fineAmount": int(self.fine_amount or 0),
            "adminNote": self.admin_note,
            "approvedBy": self.approved_by,
            "lastRenewedAt": self.last_renewed_at.isoformat() if self.last_renewed_at else None,
            "isOverdue": self.is_overdue(),
            "daysRemaining": self.days_remaining(),
            "bookTitle": self.book.title if self.book else "Sách không xác định",
            "bookCover": self.book.cover if self.book else None,
            "bookCategory": self.book.category if self.book else None,
        }


class Reservation(db.Model):
    __tablename__ = "reservations"

    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    status = db.Column(db.String(30), nullable=False, default="waiting", index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    notified_at = db.Column(db.DateTime(timezone=True), nullable=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    fulfilled_at = db.Column(db.DateTime(timezone=True), nullable=True)
    user = db.relationship("User", lazy=True)

    def to_dict(self, queue_position=None):
        return {
            "id": self.id,
            "bookId": self.book_id,
            "bookTitle": self.book.title if self.book else None,
            "bookCover": self.book.cover if self.book else None,
            "userId": self.user_id,
            "userName": (self.user.full_name or self.user.username) if self.user else None,
            "username": self.user.username if self.user else None,
            "status": self.status,
            "queuePosition": queue_position,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "notifiedAt": self.notified_at.isoformat() if self.notified_at else None,
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
        }


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False, default="info")
    link = db.Column(db.String(255), nullable=True)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "link": self.link,
            "isRead": self.is_read,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True, index=True)
    username = db.Column(db.String(100), nullable=True)
    action = db.Column(db.String(100), nullable=False, index=True)
    entity_type = db.Column(db.String(80), nullable=True, index=True)
    entity_id = db.Column(db.String(100), nullable=True)
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(80), nullable=True)
    request_id = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    def details_dict(self):
        try:
            return json.loads(self.details or "{}")
        except (TypeError, json.JSONDecodeError):
            return {}

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "username": self.username,
            "action": self.action,
            "entityType": self.entity_type,
            "entityId": self.entity_id,
            "details": self.details_dict(),
            "ipAddress": self.ip_address,
            "requestId": self.request_id,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    token_hash = db.Column(db.String(255), nullable=False, unique=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    used_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
