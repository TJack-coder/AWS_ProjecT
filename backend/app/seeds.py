import logging

from app.extensions import db
from app.modules.books.models import Book

logger = logging.getLogger(__name__)

SAMPLE_BOOKS = [
    {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "category": "Programming",
        "description": "A handbook of agile software craftsmanship.",
        "available": True,
    },
    {
        "title": "Design Patterns",
        "author": "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
        "category": "Software Engineering",
        "description": "Classic design pattern book for object-oriented software design.",
        "available": True,
    },
    {
        "title": "Python Crash Course",
        "author": "Eric Matthes",
        "category": "Programming",
        "description": "A practical introduction to Python programming.",
        "available": True,
    },
]


def seed_books_if_empty() -> None:
    if Book.query.count() > 0:
        return

    db.session.add_all(Book(**book) for book in SAMPLE_BOOKS)
    db.session.commit()
    logger.info("Seeded sample books", extra={"extra_data": {"count": len(SAMPLE_BOOKS)}})
