# CloudLibrary — Professional V3

CloudLibrary là hệ thống quản lý thư viện dùng **React + Flask + PostgreSQL**, đóng gói bằng Docker và tự động triển khai lên **Amazon Elastic Beanstalk** qua GitHub Actions, Amazon ECR và GitHub OIDC.

![CloudLibrary overview](docs/assets/cloudlibrary-overview.png)

## Những phần đã hoàn thiện

### Trải nghiệm và nhận diện

- Giao diện đăng nhập responsive, hiện/ẩn mật khẩu, ghi nhớ đăng nhập, loading và thông báo lỗi rõ ràng.
- Đã **xóa hoàn toàn hai thẻ tài khoản demo** khỏi giao diện đăng nhập.
- Có đăng ký độc giả, quên mật khẩu, hồ sơ cá nhân, ảnh đại diện và đổi mật khẩu.
- Favicon, metadata, footer, điều hướng không dùng `/#`; URL frontend theo dạng `/dashboard`, `/books`, `/my-books`, `/profile`.
- Nginx có SPA fallback để mở trực tiếp các URL trên mà không lỗi 404.

### Kho sách và hình ảnh

- 60 đầu sách, mỗi đầu sách có ảnh bìa **lưu trực tiếp trong source** tại `frontend/public/assets/covers/`; không tải ảnh từ URL bên ngoài.
- Ảnh hero và favicon cũng là tài nguyên local.
- Admin chọn ảnh bìa hoặc ảnh đại diện trực tiếp từ máy.
- Backend hỗ trợ hai chế độ lưu ảnh:
  - local volume cho chạy thử;
  - Amazon S3 khi cấu hình `AWS_IMAGE_BUCKET` và `AWS_IMAGE_BASE_URL`.
- CRUD sách đầy đủ, số lượng bản, lưu trữ mềm, khôi phục, ISBN, NXB, năm xuất bản, vị trí kệ.
- Import danh mục bằng CSV/XLSX; export CSV/XLSX/PDF.
- Tìm kiếm, lọc, sắp xếp, phân trang và tìm kiếm thông minh.
- QR cho từng sách; có thể đọc QR từ một ảnh trên Chrome hỗ trợ `BarcodeDetector`.

### Mượn, trả, gia hạn và đặt trước

- User tự mượn bằng thông tin hồ sơ, không được sửa danh tính trên phiếu.
- Admin có thể chọn đúng độc giả khi lập phiếu.
- User chỉ **gửi yêu cầu trả**; admin kiểm tra sách rồi mới xác nhận nhận lại.
- Khi nhận sách, admin ghi tình trạng, tiền phạt và ghi chú.
- User gửi yêu cầu gia hạn; admin duyệt hoặc từ chối.
- Tối đa hai lần gia hạn; không gia hạn sách quá hạn.
- Đặt trước theo hàng đợi, hủy đặt trước và thông báo sách đã sẵn sàng.
- Cảnh báo sắp đến hạn, quá hạn và trung tâm thông báo.

### Quản trị và báo cáo

- Dashboard theo vai trò với số đầu sách, số bản, sách đang mượn, quá hạn, đặt trước, tiền phạt và xu hướng 14 ngày.
- Quản lý tài khoản: khóa/mở khóa, đặt lại mật khẩu.
- Audit log có người thực hiện, hành động, đối tượng, request ID, IP và thời gian.
- Xuất báo cáo mượn trả CSV, Excel và PDF.
- Chat assistant tra cứu tình trạng, sách đang mượn, hạn trả và gợi ý sách.

### Bảo mật

- JWT, rate limit đăng nhập, khóa tạm tài khoản sau nhiều lần sai.
- Security headers, request ID, CORS cấu hình bằng biến môi trường.
- CCCD và số điện thoại được che ở dữ liệu hiển thị nghiệp vụ.
- Không ghi secret trong repository; `.env` và thư mục upload runtime bị ignore.
- GitHub Actions đăng nhập AWS qua OIDC, không lưu access key dài hạn.

### AWS và vận hành

- Build hai image và push lên ECR bằng commit SHA.
- Tạo Elastic Beanstalk application version, deploy và health check tự động.
- Script OIDC đã chứa các quyền Beanstalk/CloudFormation/S3/Auto Scaling từng cần trong quá trình triển khai.
- CloudWatch JSON logs, metric filters, CPU/memory/latency/error alarms, Top API Logs Insights widget.
- Có thể gắn SNS vào alarm bằng `SNS_TOPIC_ARN`.
- Có tùy chọn AWS X-Ray (`ENABLE_XRAY=true`), Amazon SES và Amazon S3.
- `DATABASE_URL` có thể trỏ sang Amazon RDS mà không phải sửa source.

> Custom domain, chứng chỉ ACM và HTTPS listener là hạ tầng bên ngoài source nên được để lại cho giai đoạn tiếp theo theo yêu cầu.

## Cấu hình ảnh local hoặc Amazon S3

### Local

```env
UPLOAD_FOLDER=/app/uploads
AWS_IMAGE_BUCKET=
AWS_IMAGE_BASE_URL=
```

### Amazon S3

```env
AWS_REGION=ap-southeast-2
AWS_IMAGE_BUCKET=your-cloudlibrary-image-bucket
AWS_IMAGE_BASE_URL=https://your-cloudfront-domain.example
```

Role chạy backend cần tối thiểu quyền `s3:PutObject` cho prefix chứa ảnh. Nên phân phối ảnh qua CloudFront hoặc bucket policy chỉ đọc, không bật public ACL tùy tiện.

## Chuyển database sang Amazon RDS

Tạo RDS PostgreSQL, mở Security Group 5432 chỉ từ Beanstalk, rồi đặt:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@RDS_ENDPOINT:5432/DATABASE_NAME
```

Khi đã dùng RDS, xóa service `db` và `depends_on: db` khỏi bundle Beanstalk nếu không còn cần PostgreSQL container.

## Email khôi phục mật khẩu

```env
SES_FROM_EMAIL=no-reply@your-verified-domain.example
RESET_URL_BASE=https://your-domain.example/reset-password
EXPOSE_RESET_TOKEN=false
```

Email hoặc domain gửi phải được xác minh trong Amazon SES cùng region.

## CloudWatch và SNS

```bash
export SNS_TOPIC_ARN=arn:aws:sns:ap-southeast-2:ACCOUNT_ID:cloudlibrary-alerts
./cloudwatch/setup_phase1.sh
```

Để thử trước mà chưa dùng SNS, chạy script không đặt `SNS_TOPIC_ARN`.

## Chạy local

```bash
cp .env.example .env
# Thay mật khẩu, JWT secret và các biến cần thiết.
docker compose up --build -d
```

Mở `http://localhost` và kiểm tra:

```bash
curl http://localhost/health
```

Dừng:

```bash
docker compose down
```

## Kiểm thử

```bash
cd backend
python -m pip install -r requirements-dev.txt
PYTHONPATH=. python -m pytest -q
```

Frontend:

```bash
cd frontend
npm ci
VITE_API_BASE_URL=/api npm run build
```

## Auto deploy lên branch `develop_2.0`

Repository GitHub cần hai Variables:

```text
AWS_ROLE_ARN
EB_BUCKET
```

Sau khi chỉnh code:

```bash
git switch develop_2.0
git pull --rebase origin develop_2.0
git add -A
git commit -m "feat: deploy CloudLibrary Professional V3"
git push origin develop_2.0
```

Workflow sẽ chạy:

```text
Python syntax + API tests
→ Frontend build
→ Docker image build
→ ECR push
→ Beanstalk application version
→ Environment update
→ Health verification
```

## Lưu ý khi deploy đè lên database cũ

Backend chạy migration idempotent để bổ sung các cột và bảng mới. Dữ liệu mượn cũ được giữ lại. Với production lâu dài, nên chuyển sang Alembic/Flask-Migrate và backup database trước mỗi migration lớn.

## Tài khoản khởi tạo

Tài khoản seed được điều khiển bởi Environment Properties, không hiển thị trên UI:

```env
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=CHANGE_ADMIN_PASSWORD
DEFAULT_USER_USERNAME=user
DEFAULT_USER_PASSWORD=CHANGE_USER_PASSWORD
```

Phải đổi mật khẩu thật trong Elastic Beanstalk trước khi công khai website.
