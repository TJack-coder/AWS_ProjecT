# API Specification - Authentication + Borrow/Return

Base URL local:

```text
http://localhost:5000
```

Các API có yêu cầu đăng nhập cần gửi header:

```http
Authorization: Bearer <access_token>
```

Header JSON chung:

```http
Content-Type: application/json
```

## 1. Default accounts

Backend tự seed tài khoản mặc định khi bảng `users` còn trống.

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| User | `user` | `user123` |

Có thể override trong `.env`:

```env
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_USER_USERNAME=user
DEFAULT_USER_PASSWORD=user123
JWT_SECRET_KEY=dev-secret-key-change-me
JWT_EXPIRES_HOURS=24
```

## 2. Permission summary

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/health` | Public |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | User/Admin |
| GET | `/users` | Admin |
| GET | `/books` | Public |
| GET | `/books/{id}` | Public |
| POST | `/books` | Admin |
| PUT | `/books/{id}` | Admin |
| DELETE | `/books/{id}` | Admin |
| POST | `/borrow` | User/Admin |
| POST | `/return` | User/Admin |
| GET | `/my-borrow-records` | User/Admin |
| GET | `/borrow-records` | Admin |

## 3. Health check

```http
GET /health
```

Response `200`:

```json
{
  "status": "ok",
  "service": "library-flask-api"
}
```

## 4. Authentication

### 4.1. Register

```http
POST /auth/register
```

Request body:

```json
{
  "username": "nguyenvana",
  "password": "123456",
  "fullName": "Nguyen Van A",
  "phone": "0900000000",
  "cccd": "012345678901"
}
```

Response `201`:

```json
{
  "message": "Register successfully",
  "access_token": "<jwt_token>",
  "token_type": "Bearer",
  "user": {
    "id": 3,
    "username": "nguyenvana",
    "role": "user",
    "fullName": "Nguyen Van A",
    "phone": "0900000000",
    "cccd": "012345678901"
  }
}
```

Possible errors:

| Status | Meaning |
|---|---|
| 400 | Thiếu `username` hoặc `password`, hoặc password dưới 6 ký tự |
| 409 | Username đã tồn tại |

### 4.2. Login

```http
POST /auth/login
```

Request body:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response `200`:

```json
{
  "message": "Login successfully",
  "access_token": "<jwt_token>",
  "token_type": "Bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "fullName": "System Admin",
    "phone": null,
    "cccd": null
  }
}
```

Possible errors:

| Status | Meaning |
|---|---|
| 400 | Thiếu `username` hoặc `password` |
| 401 | Sai username/password |

### 4.3. Get current user

```http
GET /auth/me
Authorization: Bearer <access_token>
```

Response `200`:

```json
{
  "id": 1,
  "username": "admin",
  "role": "admin",
  "fullName": "System Admin",
  "phone": null,
  "cccd": null,
  "created_at": "2026-06-16T04:31:56.000000+00:00",
  "updated_at": "2026-06-16T04:31:56.000000+00:00"
}
```

Possible errors:

| Status | Meaning |
|---|---|
| 401 | Thiếu token, token sai hoặc token hết hạn |

## 5. Users

### 5.1. Get users

Admin only.

```http
GET /users
Authorization: Bearer <admin_access_token>
```

Response `200`:

```json
[
  {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "fullName": "System Admin",
    "phone": null,
    "cccd": null
  }
]
```

Possible errors:

| Status | Meaning |
|---|---|
| 401 | Chưa đăng nhập |
| 403 | Không có quyền admin |

## 6. Books

### 6.1. Get books

```http
GET /books
```

Response `200`:

```json
[
  {
    "id": 1,
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "category": "Programming",
    "description": "A handbook of agile software craftsmanship.",
    "cover": "https://placehold.co/300x450?text=Clean+Code",
    "available": true,
    "created_at": "2026-06-16T04:31:56.000000+00:00",
    "updated_at": "2026-06-16T04:31:56.000000+00:00"
  }
]
```

### 6.2. Get book detail

```http
GET /books/{id}
```

Response `200`:

```json
{
  "id": 1,
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "category": "Programming",
  "description": "A handbook of agile software craftsmanship.",
  "cover": "https://placehold.co/300x450?text=Clean+Code",
  "available": true,
  "borrow_records": []
}
```

Possible errors:

| Status | Meaning |
|---|---|
| 404 | Không tìm thấy sách |

### 6.3. Create book

Admin only.

```http
POST /books
Authorization: Bearer <admin_access_token>
Content-Type: application/json
```

Request body:

```json
{
  "title": "Clean Architecture",
  "author": "Robert C. Martin",
  "category": "Software Architecture",
  "description": "A craftsman's guide to software structure and design.",
  "cover": "https://placehold.co/300x450?text=Clean+Architecture",
  "available": true
}
```

Response `201`:

```json
{
  "id": 41,
  "title": "Clean Architecture",
  "author": "Robert C. Martin",
  "category": "Software Architecture",
  "description": "A craftsman's guide to software structure and design.",
  "cover": "https://placehold.co/300x450?text=Clean+Architecture",
  "available": true
}
```

Possible errors:

| Status | Meaning |
|---|---|
| 400 | Thiếu `title` hoặc `author` |
| 401 | Chưa đăng nhập |
| 403 | Không có quyền admin |

### 6.4. Update book

Admin only.

```http
PUT /books/{id}
Authorization: Bearer <admin_access_token>
Content-Type: application/json
```

Request body có thể gửi một phần field cần cập nhật:

```json
{
  "title": "Clean Architecture - Updated",
  "category": "Architecture",
  "cover": "https://example.com/cover.jpg",
  "available": true
}
```

Response `200`:

```json
{
  "id": 1,
  "title": "Clean Architecture - Updated",
  "author": "Robert C. Martin",
  "category": "Architecture",
  "description": "A craftsman's guide to software structure and design.",
  "cover": "https://example.com/cover.jpg",
  "available": true
}
```

Possible errors:

| Status | Meaning |
|---|---|
| 401 | Chưa đăng nhập |
| 403 | Không có quyền admin |
| 404 | Không tìm thấy sách |

### 6.5. Delete book

Admin only.

```http
DELETE /books/{id}
Authorization: Bearer <admin_access_token>
```

Response `200`:

```json
{
  "message": "Book deleted successfully"
}
```

Possible errors:

| Status | Meaning |
|---|---|
| 401 | Chưa đăng nhập |
| 403 | Không có quyền admin |
| 404 | Không tìm thấy sách |

## 7. Borrow/Return

### 7.1. Borrow book

User/Admin.

```http
POST /borrow
Authorization: Bearer <access_token>
Content-Type: application/json
```

Request body:

```json
{
  "book_id": 1,
  "customerName": "Nguyen Van A",
  "phone": "0900000000",
  "cccd": "012345678901",
  "returnDate": "2026-07-01",
  "deposit": 150000
}
```

Có thể dùng `bookId` thay cho `book_id` nếu frontend đang gửi camelCase.

Admin có thể truyền thêm `user_id` nếu muốn tạo phiếu mượn thay cho user khác:

```json
{
  "book_id": 1,
  "user_id": 2,
  "customerName": "Nguyen Van A",
  "phone": "0900000000",
  "cccd": "012345678901",
  "returnDate": "2026-07-01",
  "deposit": 150000
}
```

Response `200`:

```json
{
  "message": "Borrow book successfully",
  "book": {
    "id": 1,
    "title": "Clean Code",
    "available": false
  },
  "record": {
    "id": 1,
    "book_id": 1,
    "user_id": "2",
    "customerName": "Nguyen Van A",
    "phone": "0900000000",
    "cccd": "012345678901",
    "expectedReturnDate": "2026-07-01",
    "deposit": 150000,
    "borrow_date": "2026-06-16T04:31:56.000000+00:00",
    "return_date": null,
    "status": "active",
    "bookTitle": "Clean Code"
  }
}
```

Possible errors:

| Status | Meaning |
|---|---|
| 400 | Thiếu `book_id` |
| 401 | Chưa đăng nhập |
| 404 | Không tìm thấy sách |
| 409 | Sách không khả dụng |
| 500 | Lỗi xử lý mượn sách |

### 7.2. Return book

User/Admin.

```http
POST /return
Authorization: Bearer <access_token>
Content-Type: application/json
```

Có thể trả theo `book_id`:

```json
{
  "book_id": 1
}
```

Hoặc trả theo `record_id`:

```json
{
  "record_id": 1
}
```

Có thể dùng `bookId`/`recordId` nếu frontend đang gửi camelCase.

Response `200`:

```json
{
  "message": "Return book successfully",
  "book": {
    "id": 1,
    "title": "Clean Code",
    "available": true
  },
  "record": {
    "id": 1,
    "book_id": 1,
    "user_id": "2",
    "customerName": "Nguyen Van A",
    "phone": "0900000000",
    "cccd": "012345678901",
    "expectedReturnDate": "2026-07-01",
    "deposit": 150000,
    "borrow_date": "2026-06-16T04:31:56.000000+00:00",
    "return_date": "2026-06-17T04:31:56.000000+00:00",
    "status": "returned",
    "bookTitle": "Clean Code"
  }
}
```

Possible errors:

| Status | Meaning |
|---|---|
| 400 | Thiếu cả `book_id` và `record_id` |
| 401 | Chưa đăng nhập |
| 403 | User thường đang cố trả phiếu mượn của người khác |
| 404 | Không tìm thấy sách |
| 409 | Không tìm thấy phiếu mượn active hoặc sách đã được trả |
| 500 | Lỗi xử lý trả sách |

### 7.3. Get my borrow records

User/Admin.

```http
GET /my-borrow-records
Authorization: Bearer <access_token>
```

Response `200`:

```json
[
  {
    "id": 1,
    "book_id": 1,
    "user_id": "2",
    "customerName": "Nguyen Van A",
    "phone": "0900000000",
    "cccd": "012345678901",
    "expectedReturnDate": "2026-07-01",
    "deposit": 150000,
    "borrow_date": "2026-06-16T04:31:56.000000+00:00",
    "return_date": null,
    "status": "active",
    "bookTitle": "Clean Code"
  }
]
```

### 7.4. Get all borrow records

Admin only.

```http
GET /borrow-records
Authorization: Bearer <admin_access_token>
```

Response `200`:

```json
[
  {
    "id": 1,
    "book_id": 1,
    "user_id": "2",
    "customerName": "Nguyen Van A",
    "phone": "0900000000",
    "cccd": "012345678901",
    "expectedReturnDate": "2026-07-01",
    "deposit": 150000,
    "borrow_date": "2026-06-16T04:31:56.000000+00:00",
    "return_date": null,
    "status": "active",
    "bookTitle": "Clean Code"
  }
]
```

Possible errors:

| Status | Meaning |
|---|---|
| 401 | Chưa đăng nhập |
| 403 | Không có quyền admin |

## 8. Common error format

```json
{
  "message": "Error message"
}
```

Một số status code thường gặp:

| Status | Ý nghĩa |
|---|---|
| 400 | Request body thiếu hoặc không hợp lệ |
| 401 | Thiếu token, token sai hoặc token hết hạn |
| 403 | Không đủ quyền |
| 404 | Không tìm thấy resource |
| 409 | Xung đột nghiệp vụ, ví dụ sách đã được mượn |
| 500 | Lỗi server |

## 9. Curl examples

### Login admin

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Create book with admin token

```bash
curl -X POST http://localhost:5000/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_access_token>" \
  -d '{"title":"Clean Architecture","author":"Robert C. Martin","category":"Software Architecture","description":"Architecture guide","cover":"https://placehold.co/300x450?text=Clean+Architecture"}'
```

### Borrow book

```bash
curl -X POST http://localhost:5000/borrow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"book_id":1,"customerName":"Nguyen Van A","phone":"0900000000","cccd":"012345678901","returnDate":"2026-07-01","deposit":150000}'
```

### Return book

```bash
curl -X POST http://localhost:5000/return \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"book_id":1}'
```
