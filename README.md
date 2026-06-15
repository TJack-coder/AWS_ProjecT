# Library Borrowing System - Sprint 0

Ứng dụng mượn/trả sách cơ bản theo Sprint 0 của kế hoạch AWS Library System.

## 1. Tech stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Backend API | Flask |
| Database | PostgreSQL |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Logging | Structured JSON logs từ Flask |

## 2. Chức năng đã làm

- Xem danh sách sách.
- Xem chi tiết sách.
- Thêm sách mới.
- Cập nhật sách.
- Xóa sách.
- Mượn sách.
- Trả sách.
- Xem lịch sử mượn/trả.
- Log request theo dạng JSON.
- Dockerize frontend, backend và PostgreSQL.
- GitHub Actions CI cơ bản.
- GitHub Actions deploy template cho AWS Elastic Beanstalk.

## 3. Cấu trúc thư mục

```text
library-borrowing-system-sprint0/
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── docs/
│   ├── API.md
│   └── BRANCHING_STRATEGY.md
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── deploy-beanstalk.yml
│   ├── CODEOWNERS
│   └── PULL_REQUEST_TEMPLATE/
├── docker-compose.yml
├── .env.example
└── README.md
```

## 4. Cách chạy bằng Docker Compose

Yêu cầu máy đã cài:

- Docker
- Docker Compose

Chạy toàn bộ hệ thống:

```bash
docker compose up --build
```

Sau khi chạy xong:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/health
- PostgreSQL: localhost:5432

Dừng hệ thống:

```bash
docker compose down
```

Dừng và xóa luôn dữ liệu database local:

```bash
docker compose down -v
```

## 5. Cách chạy local không dùng Docker

### 5.1 Backend Flask

Tạo môi trường Python:

```bash
cd backend
python -m venv .venv
```

Kích hoạt môi trường:

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Cài thư viện:

```bash
pip install -r requirements.txt
```

Tạo file `.env` từ `.env.example`, sau đó chạy:

```bash
python app.py
```

### 5.2 Frontend React

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy ở:

```text
http://localhost:5173
```

## 6. API chính

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/health` | Kiểm tra backend có chạy không |
| GET | `/books` | Lấy danh sách sách |
| GET | `/books/{id}` | Lấy chi tiết sách |
| POST | `/books` | Thêm sách |
| PUT | `/books/{id}` | Cập nhật sách |
| DELETE | `/books/{id}` | Xóa sách |
| POST | `/borrow` | Mượn sách |
| POST | `/return` | Trả sách |
| GET | `/borrow-records` | Xem lịch sử mượn/trả |

Ví dụ mượn sách:

```bash
curl -X POST http://localhost:5000/borrow \
  -H "Content-Type: application/json" \
  -d '{"book_id": 1, "user_id": "U001"}'
```

Ví dụ trả sách:

```bash
curl -X POST http://localhost:5000/return \
  -H "Content-Type: application/json" \
  -d '{"book_id": 1, "user_id": "U001"}'
```

## 7. Database schema

### books

| Column | Type | Meaning |
|---|---|---|
| id | Integer | Mã sách |
| title | String | Tên sách |
| author | String | Tác giả |
| category | String | Thể loại |
| description | Text | Mô tả |
| available | Boolean | Còn sẵn hay đang được mượn |
| created_at | DateTime | Ngày tạo |
| updated_at | DateTime | Ngày cập nhật |

### borrow_records

| Column | Type | Meaning |
|---|---|---|
| id | Integer | Mã giao dịch |
| book_id | Integer | Mã sách |
| user_id | String | Mã người dùng |
| borrow_date | DateTime | Ngày mượn |
| return_date | DateTime | Ngày trả |
| status | String | `borrowed` hoặc `returned` |

## 8. Logging

Backend xuất log dạng JSON để sau này dễ đẩy lên CloudWatch Logs.

Ví dụ log:

```json
{
  "timestamp": "2026-06-15T00:00:00+00:00",
  "level": "INFO",
  "service": "library-flask-api",
  "requestId": "request-id",
  "message": "Borrow request completed",
  "book_id": 1,
  "user_id": "U001"
}
```

## 9. GitHub Actions

Project có sẵn 2 workflow:

- `.github/workflows/ci.yml`: kiểm tra build frontend và import backend.
- `.github/workflows/deploy-beanstalk.yml`: template deploy lên AWS Elastic Beanstalk.

Các secret cần cấu hình nếu deploy AWS:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
ECR_REPOSITORY
EB_APPLICATION_NAME
EB_ENVIRONMENT_NAME
EB_SOURCE_BUCKET
```

## 10. Ghi chú Sprint 0

Sprint 0 tập trung vào app lõi và nền tảng DevOps ban đầu. Các phần nâng cao như Keycloak, Chat Agent, Vector Search, EKS, X-Ray tracing sâu sẽ làm ở các Sprint sau.
