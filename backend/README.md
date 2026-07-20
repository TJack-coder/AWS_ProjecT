# Backend - Authentication + Borrow/Return API

Backend Flask cho dự án **Library Borrowing System**. Phiên bản này mở rộng từ CRUD sách sang đầy đủ các chức năng nền tảng của hệ thống thư viện: quản lý sách, đăng ký/đăng nhập, phân quyền `admin`/`user`, mượn sách, trả sách và xem lịch sử mượn trả.

## 1. Tech stack

| Thành phần | Công nghệ |
|---|---|
| Framework | Flask |
| ORM | Flask-SQLAlchemy |
| Database | PostgreSQL |
| Auth | JWT bằng `PyJWT` |
| Password hash | Werkzeug Security |
| CORS | Flask-Cors |
| Logging | Structured JSON logs |
| Container | Docker |

## 2. Chức năng đã hiện thực

### Books

- `GET /books`: xem danh sách sách.
- `GET /books/<id>`: xem chi tiết sách.
- `POST /books`: thêm sách mới, chỉ `admin`.
- `PUT /books/<id>`: cập nhật sách, chỉ `admin`.
- `DELETE /books/<id>`: xóa sách, chỉ `admin`.
- Thêm field `cover` để frontend hiển thị ảnh bìa sách.
- Seed dữ liệu sách mẫu khi khởi động backend.

### Authentication

- `POST /auth/register`: đăng ký tài khoản người dùng.
- `POST /auth/login`: đăng nhập và nhận JWT access token.
- `GET /auth/me`: lấy thông tin user hiện tại từ token.
- Seed tài khoản mặc định cho môi trường dev:
  - Admin: `admin` / `admin123`
  - User: `user` / `user123`

### Borrow/Return

- `POST /borrow`: mượn sách, cần đăng nhập.
- `POST /return`: trả sách, cần đăng nhập.
- `GET /my-borrow-records`: user xem lịch sử mượn/trả của chính mình.
- `GET /borrow-records`: admin xem toàn bộ lịch sử mượn/trả.
- Lưu thêm thông tin khách hàng khi mượn sách:
  - `customerName`
  - `phone`
  - `cccd`
  - `returnDate`
  - `deposit`

### Logging

Backend xuất log dạng JSON, có các trường như:

```json
{
  "timestamp": "2026-06-16T04:31:56.550399+00:00",
  "level": "INFO",
  "service": "library-flask-api",
  "requestId": "system",
  "message": "Borrow request completed"
}
```

## 3. Cấu trúc backend

```text
backend/
├── app.py
├── models.py
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

Ghi chú: backend hiện đang dùng cấu trúc đơn giản `app.py` + `models.py` để tránh conflict import giữa file `app.py` và package `app/`.

## 4. Cấu hình môi trường

Tạo file `.env` trong thư mục `backend`.

### macOS/Linux

```bash
cp .env.example .env
```

### Windows CMD

```cmd
copy .env.example .env
```

Nội dung `.env` mẫu:

```env
DATABASE_URL=postgresql://library_user:library_password@localhost:5432/library_db
SERVICE_NAME=library-flask-api
LOG_LEVEL=INFO
FLASK_DEBUG=true
PORT=5000
JWT_SECRET_KEY=dev-secret-key-change-me
JWT_EXPIRES_HOURS=24
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_USER_USERNAME=user
DEFAULT_USER_PASSWORD=user123
```

Không commit file `.env` thật lên GitHub.

## 5. Chạy backend local

### 5.1. Tạo virtual environment

#### macOS/Linux

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
python --version
pip install --upgrade pip
pip install -r requirements.txt
```

#### Windows CMD

```cmd
cd backend
py -3.11 -m venv .venv
.venv\Scripts\activate.bat
python --version
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Nên dùng Python `3.11.x` để tránh lỗi native package của `psycopg2-binary`.

### 5.2. Chạy PostgreSQL bằng Docker Compose

Từ thư mục gốc project:

```bash
docker compose up -d db
```

Kiểm tra container database:

```bash
docker compose ps
```

### 5.3. Chạy Flask backend

Trong thư mục `backend`:

```bash
python app.py
```

Backend chạy tại:

```text
http://localhost:5000
```

Test health check:

```bash
curl http://localhost:5000/health
```

Kết quả mong đợi:

```json
{
  "status": "ok",
  "service": "library-flask-api"
}
```

## 6. Authentication flow cho frontend

### Bước 1: Login

Frontend gọi:

```http
POST /auth/login
```

Body:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Backend trả về `access_token`:

```json
{
  "message": "Login successfully",
  "access_token": "<jwt_token>",
  "token_type": "Bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### Bước 2: Gửi token trong các request cần đăng nhập

```http
Authorization: Bearer <jwt_token>
```

Ví dụ:

```bash
curl http://localhost:5000/auth/me \
  -H "Authorization: Bearer <jwt_token>"
```

## 7. Phân quyền API

| Endpoint | Public | User | Admin |
|---|---:|---:|---:|
| `GET /health` | ✅ | ✅ | ✅ |
| `GET /books` | ✅ | ✅ | ✅ |
| `GET /books/<id>` | ✅ | ✅ | ✅ |
| `POST /auth/register` | ✅ | ✅ | ✅ |
| `POST /auth/login` | ✅ | ✅ | ✅ |
| `GET /auth/me` | ❌ | ✅ | ✅ |
| `POST /borrow` | ❌ | ✅ | ✅ |
| `POST /return` | ❌ | ✅ | ✅ |
| `GET /my-borrow-records` | ❌ | ✅ | ✅ |
| `POST /books` | ❌ | ❌ | ✅ |
| `PUT /books/<id>` | ❌ | ❌ | ✅ |
| `DELETE /books/<id>` | ❌ | ❌ | ✅ |
| `GET /borrow-records` | ❌ | ❌ | ✅ |
| `GET /users` | ❌ | ❌ | ✅ |

## 8. Database schema

### users

| Column | Type | Ý nghĩa |
|---|---|---|
| `id` | Integer | Mã user |
| `username` | String | Tên đăng nhập |
| `password_hash` | String | Mật khẩu đã hash |
| `role` | String | `admin` hoặc `user` |
| `full_name` | String | Họ tên |
| `phone` | String | Số điện thoại |
| `cccd` | String | Căn cước công dân |
| `created_at` | DateTime | Thời điểm tạo |
| `updated_at` | DateTime | Thời điểm cập nhật |

### books

| Column | Type | Ý nghĩa |
|---|---|---|
| `id` | Integer | Mã sách |
| `title` | String | Tên sách |
| `author` | String | Tác giả |
| `category` | String | Thể loại |
| `description` | Text | Mô tả |
| `cover` | Text | Link ảnh bìa sách |
| `available` | Boolean | Sách còn sẵn hay đã được mượn |
| `created_at` | DateTime | Thời điểm tạo |
| `updated_at` | DateTime | Thời điểm cập nhật |

### borrow_records

| Column | Type | Ý nghĩa |
|---|---|---|
| `id` | Integer | Mã giao dịch |
| `book_id` | Integer | Mã sách |
| `user_id` | String | Mã người mượn |
| `customer_name` | String | Tên khách hàng |
| `phone` | String | Số điện thoại |
| `cccd` | String | CCCD |
| `expected_return_date` | String | Ngày dự kiến trả |
| `deposit` | Integer | Tiền cọc |
| `borrow_date` | DateTime | Ngày mượn |
| `return_date` | DateTime | Ngày trả thực tế |
| `status` | String | `active` hoặc `returned` |

## 9. Reset database local khi thay đổi schema

Vì `db.create_all()` chỉ tạo bảng mới, không tự sửa toàn bộ schema cũ, backend có helper dev để thêm các cột thiếu. Tuy nhiên khi test local, cách sạch nhất là reset DB:

```bash
docker compose down -v
docker compose up -d db
cd backend
python app.py
```

Lệnh `down -v` sẽ xóa dữ liệu PostgreSQL local.

## 10. API documentation

Chi tiết toàn bộ request/response nằm trong:

```text
docs/API.md
```
