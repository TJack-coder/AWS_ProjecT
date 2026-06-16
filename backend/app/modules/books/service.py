from sqlalchemy import or_

from app.extensions import db
from app.modules.books.models import Book


def list_books(search=None, category=None, available=None):
    query = Book.query

    if search:
        keyword = f"%{search.strip()}%"
        query = query.filter(or_(Book.title.ilike(keyword), Book.author.ilike(keyword)))

    if category:
        query = query.filter(Book.category == category.strip())

    if available is not None:
        query = query.filter(Book.available.is_(available))

    return query.order_by(Book.id.asc()).all()


def get_book_or_none(book_id: int):
    return db.session.get(Book, book_id)


def create_book(data: dict):
    book = Book(**data)
    db.session.add(book)
    db.session.commit()
    return book


def update_book(book: Book, data: dict):
    for field, value in data.items():
        setattr(book, field, value)
    db.session.commit()
    return book


def delete_book(book: Book):
    db.session.delete(book)
    db.session.commit()
