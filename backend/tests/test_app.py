import io
import os
import tempfile
from datetime import date, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/aws-library-import.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ.setdefault("EXPOSE_RESET_TOKEN", "true")

from app import create_app  # noqa: E402
from models import db  # noqa: E402


def make_client():
    handle = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    handle.close()
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{handle.name}",
        "JWT_SECRET_KEY": "test-secret",
        "UPLOAD_FOLDER": tempfile.mkdtemp(prefix="cloudlibrary-uploads-"),
    })
    return app, app.test_client(), handle.name


def login(client, username, password):
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200, response.get_json()
    return {"Authorization": f"Bearer {response.get_json()['access_token']}"}


def test_catalogue_login_dashboard_and_profile():
    app, client, path = make_client()
    try:
        admin_headers = login(client, "admin", "admin123")
        user_headers = login(client, "user", "user123")
        books = client.get("/books", headers=user_headers)
        assert books.status_code == 200
        assert len(books.get_json()) == 60
        assert all(str(book["cover"]).startswith("/assets/covers/") for book in books.get_json())
        assert client.get("/dashboard", headers=admin_headers).get_json()["totalUsers"] >= 3
        assert client.get("/dashboard", headers=user_headers).get_json()["role"] == "user"
        updated = client.put("/profile", headers=user_headers, json={"fullName": "Reader Updated", "email": "reader@example.com"})
        assert updated.status_code == 200
        assert updated.get_json()["fullName"] == "Reader Updated"
    finally:
        with app.app_context():
            db.session.remove()
            db.engine.dispose()
        os.unlink(path)


def test_crud_borrow_renew_request_return_admin_approval_and_archive():
    app, client, path = make_client()
    try:
        admin_headers = login(client, "admin", "admin123")
        user_headers = login(client, "user", "user123")
        created = client.post("/books", headers=admin_headers, json={
            "title": "Test Book", "author": "Test Author", "category": "Testing",
            "totalQuantity": 2, "cover": "/assets/covers/book-01.png",
        })
        assert created.status_code == 201
        book_id = created.get_json()["id"]
        updated = client.put(f"/books/{book_id}", headers=admin_headers, json={"totalQuantity": 4, "shelfLocation": "T-01"})
        assert updated.get_json()["availableQuantity"] == 4
        due = (date.today() + timedelta(days=14)).isoformat()
        borrowed = client.post("/borrow", headers=user_headers, json={"book_id": book_id, "returnDate": due})
        assert borrowed.status_code == 200, borrowed.get_json()
        record_id = borrowed.get_json()["record"]["id"]
        requested = client.post(f"/borrow-records/{record_id}/renew", headers=user_headers)
        assert requested.status_code == 200
        assert requested.get_json()["renewalStatus"] == "pending"
        approved = client.post(f"/borrow-records/{record_id}/renew-decision", headers=admin_headers, json={"approved": True})
        assert approved.status_code == 200
        assert approved.get_json()["renewCount"] == 1
        return_request = client.post(f"/borrow-records/{record_id}/request-return", headers=user_headers)
        assert return_request.status_code == 200
        assert return_request.get_json()["status"] == "return_requested"
        returned = client.post(f"/borrow-records/{record_id}/approve-return", headers=admin_headers, json={"condition": "good", "fineAmount": 0})
        assert returned.status_code == 200
        assert returned.get_json()["status"] == "returned"
        archived = client.delete(f"/books/{book_id}", headers=admin_headers)
        assert archived.status_code == 200
        restored = client.post(f"/books/{book_id}/restore", headers=admin_headers)
        assert restored.status_code == 200
        assert restored.get_json()["isActive"] is True
        qr = client.get(f"/books/{book_id}/qr")
        assert qr.status_code == 200
        assert qr.content_type == "image/png"
    finally:
        with app.app_context():
            db.session.remove()
            db.engine.dispose()
        os.unlink(path)


def test_reservation_notifications_audit_and_reports():
    app, client, path = make_client()
    try:
        admin_headers = login(client, "admin", "admin123")
        user_headers = login(client, "user", "user123")
        books = client.get("/books", headers=user_headers).get_json()
        book_id = books[0]["id"]
        reserved = client.post(f"/books/{book_id}/reservations", headers=user_headers)
        assert reserved.status_code == 201
        reservation_id = reserved.get_json()["id"]
        notified = client.post(f"/reservations/{reservation_id}/notify", headers=admin_headers)
        assert notified.status_code == 200
        notifications = client.get("/notifications", headers=user_headers)
        assert notifications.status_code == 200
        assert len(notifications.get_json()) >= 1
        audits = client.get("/audit-logs", headers=admin_headers)
        assert audits.status_code == 200
        assert any(item["action"] == "reservation.notify" for item in audits.get_json())
        for fmt in ["csv", "xlsx", "pdf"]:
            report = client.get(f"/reports/borrowings?format={fmt}", headers=admin_headers)
            assert report.status_code == 200
            book_report = client.get(f"/reports/books?format={fmt}", headers=admin_headers)
            assert book_report.status_code == 200
        csv_data = "Tên sách,Tác giả,Thể loại,Tổng số bản\nImported Book,Import Author,Testing,5\n"
        imported = client.post(
            "/books/import",
            headers=admin_headers,
            data={"file": (io.BytesIO(csv_data.encode("utf-8")), "books.csv")},
            content_type="multipart/form-data",
        )
        assert imported.status_code == 200, imported.get_json()
        assert imported.get_json()["created"] == 1
    finally:
        with app.app_context():
            db.session.remove()
            db.engine.dispose()
        os.unlink(path)
