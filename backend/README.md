# Backend - feature/book-crud-api

Backend Flask cho dự án Library Borrowing System. Branch này tập trung vào API CRUD sách và chuẩn bị sẵn cấu trúc thư mục cho các phần mở rộng sau.

## Chức năng đã hiện thực

- `GET /health`
- `GET /books`
- `GET /books/<id>`
- `POST /books`
- `PUT /books/<id>`
- `DELETE /books/<id>`
- Structured JSON logging với `requestId`
- PostgreSQL qua SQLAlchemy
- Dockerfile backend
- Cấu trúc module sẵn cho borrow/return, auth, monitoring, AWS helpers

## Cấu trúc thư mục

```text
backend/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── extensions.py
│   ├── seeds.py
│   ├── common/
│   │   ├── errors.py
│   │   ├── logging.py
│   │   ├── request_context.py
│   │   └── responses.py
│   └── modules/
│       ├── books/
│       │   ├── models.py
│       │   ├── routes.py
│       │   ├── schemas.py
│       │   └── service.py
│       ├── borrow_records/
│       │   ├── models.py
│       │   ├── routes.py
│       │   └── service.py
│       ├── auth/
│       │   ├── routes.py
│       │   └── service.py
│       ├── monitoring/
│       │   └── routes.py
│       └── aws/
│           └── README.md
├── migrations/
├── tests/
│   └── test_books_api.py
├── app.py
├── wsgi.py
├── Dockerfile
├── requirements.txt
├── requirements-dev.txt
└── .env.example
```

## Chạy local không dùng Docker

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
python app.py
```

Backend chạy ở:

```text
http://localhost:5000
```

## Chạy bằng Docker Compose

Từ thư mục gốc project:

```bash
docker compose up --build
```

## API examples

### Create book

```bash
curl -X POST http://localhost:5000/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean Code","author":"Robert C. Martin","category":"Programming","description":"A handbook of agile software craftsmanship."}'
```

### Get books

```bash
curl http://localhost:5000/books
```

### Get book detail

```bash
curl http://localhost:5000/books/1
```

### Update book

```bash
curl -X PUT http://localhost:5000/books/1 \
  -H "Content-Type: application/json" \
  -d '{"category":"Software Engineering"}'
```

### Delete book

```bash
curl -X DELETE http://localhost:5000/books/1
```

## Test

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Ghi chú

Các API `POST /borrow`, `POST /return`, `GET /borrow-records`, Keycloak, CloudWatch helper, X-Ray tracing chưa được hiện thực trong branch này. Các thư mục tương ứng chỉ là khung để triển khai ở các feature branch sau.
