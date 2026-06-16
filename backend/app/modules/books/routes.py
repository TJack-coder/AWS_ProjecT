import logging

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from app.common.logging import log_error, log_info
from app.common.responses import error
from app.extensions import db
from app.modules.books.schemas import (
    validate_create_book_payload,
    validate_update_book_payload,
)
from app.modules.books.service import (
    create_book,
    delete_book,
    get_book_or_none,
    list_books,
    update_book,
)

books_bp = Blueprint("books", __name__)
logger = logging.getLogger(__name__)


def parse_available(value):
    if value is None or value == "":
        return None
    return value.lower() in ["true", "1", "yes", "y"]


@books_bp.get("/books")
def get_books():
    books = list_books(
        search=request.args.get("search"),
        category=request.args.get("category"),
        available=parse_available(request.args.get("available")),
    )
    log_info(logger, "Fetched books", count=len(books))
    return jsonify([book.to_dict() for book in books])


@books_bp.get("/books/<int:book_id>")
def get_book(book_id):
    book = get_book_or_none(book_id)
    if not book:
        return error("Book not found", 404)

    log_info(logger, "Fetched book detail", book_id=book_id)
    return jsonify(book.to_dict())


@books_bp.post("/books")
def post_book():
    payload = request.get_json(silent=True) or {}
    data, validation_error = validate_create_book_payload(payload)
    if validation_error:
        return error(**validation_error, status_code=400)

    try:
        book = create_book(data)
        log_info(logger, "Created book", book_id=book.id)
        return jsonify(book.to_dict()), 201
    except SQLAlchemyError as exc:
        db.session.rollback()
        log_error(logger, "Create book failed", error=str(exc))
        return error("Create book failed", 500)


@books_bp.put("/books/<int:book_id>")
def put_book(book_id):
    book = get_book_or_none(book_id)
    if not book:
        return error("Book not found", 404)

    payload = request.get_json(silent=True) or {}
    data, validation_error = validate_update_book_payload(payload)
    if validation_error:
        return error(**validation_error, status_code=400)

    try:
        updated_book = update_book(book, data)
        log_info(logger, "Updated book", book_id=updated_book.id)
        return jsonify(updated_book.to_dict())
    except SQLAlchemyError as exc:
        db.session.rollback()
        log_error(logger, "Update book failed", error=str(exc), book_id=book_id)
        return error("Update book failed", 500)


@books_bp.delete("/books/<int:book_id>")
def delete_book_by_id(book_id):
    book = get_book_or_none(book_id)
    if not book:
        return error("Book not found", 404)

    try:
        delete_book(book)
        log_info(logger, "Deleted book", book_id=book_id)
        return jsonify({"message": "Book deleted successfully"})
    except SQLAlchemyError as exc:
        db.session.rollback()
        log_error(logger, "Delete book failed", error=str(exc), book_id=book_id)
        return error("Delete book failed", 500)
