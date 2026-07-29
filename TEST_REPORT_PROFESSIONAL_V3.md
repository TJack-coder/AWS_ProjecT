# Test Report — CloudLibrary Professional V3

## Đã kiểm tra trong môi trường đóng gói

- Python `compileall`: đạt.
- Toàn bộ JavaScript/JSX được parse bằng TypeScript compiler API: đạt.
- YAML workflow, Compose và Elastic Beanstalk: parse thành công.
- JSON: hợp lệ.
- Toàn bộ shell script: qua `bash -n`.
- Seed xác nhận đúng 60 đầu sách.
- 60 đường dẫn ảnh seed đều trỏ tới PNG local tồn tại.
- Không còn ảnh bìa phụ thuộc OpenLibrary/Unsplash.
- Không còn hai thẻ tài khoản demo trong frontend.
- Nginx có `/api`, `/health` và SPA fallback.

## Không chạy được tại môi trường đóng gói

Môi trường nội bộ không truy cập được package mirror cho Flask/Vite, vì vậy không thể cài dependencies để chạy `pytest`, `npm ci`, Docker và kiểm thử end-to-end tại đây. Các workflow GitHub Actions đã được cấu hình để thực hiện API tests và frontend production build trước khi auto deploy.

## Kiểm thử sau khi push

1. Chờ workflow `CI` xanh.
2. Chờ `Deploy AWS Library` xanh.
3. Kiểm tra `/health` trả HTTP 200.
4. Kiểm tra admin: CRUD, upload ảnh, import/export, duyệt gia hạn/trả.
5. Kiểm tra user: đăng ký, mượn, yêu cầu trả, đặt trước, profile và thông báo.
6. Kiểm tra ảnh local và ảnh upload từ volume/S3.
