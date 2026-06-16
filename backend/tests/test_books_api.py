import pytest

from app import create_app
from app.config import TestingConfig
from app.extensions import db


@pytest.fixture()
def client():
    app = create_app(TestingConfig())
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


def create_sample_book(client):
    response = client.post(
        "/books",
        json={
            "title": "Clean Code",
            "author": "Robert C. Martin",
            "category": "Programming",
            "description": "A handbook of agile software craftsmanship.",
        },
    )
    assert response.status_code == 201
    return response.get_json()


def test_create_book(client):
    data = create_sample_book(client)
    assert data["id"] == 1
    assert data["title"] == "Clean Code"
    assert data["available"] is True


def test_get_books(client):
    create_sample_book(client)
    response = client.get("/books")
    assert response.status_code == 200
    assert len(response.get_json()) == 1


def test_get_book_detail(client):
    created = create_sample_book(client)
    response = client.get(f"/books/{created['id']}")
    assert response.status_code == 200
    assert response.get_json()["author"] == "Robert C. Martin"


def test_update_book(client):
    created = create_sample_book(client)
    response = client.put(f"/books/{created['id']}", json={"category": "Software"})
    assert response.status_code == 200
    assert response.get_json()["category"] == "Software"


def test_delete_book(client):
    created = create_sample_book(client)
    response = client.delete(f"/books/{created['id']}")
    assert response.status_code == 200
    assert response.get_json()["message"] == "Book deleted successfully"

    not_found_response = client.get(f"/books/{created['id']}")
    assert not_found_response.status_code == 404
