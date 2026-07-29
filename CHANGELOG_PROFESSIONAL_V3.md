# CloudLibrary Professional V3 — Changelog

## Giao diện
- Xóa hai thẻ tài khoản demo.
- Bỏ hash routing, bổ sung route sạch và Nginx SPA fallback.
- Thêm favicon, metadata, profile, notification center, chat widget.
- Cải thiện responsive, loading, password visibility, remember login và forgot password.

## Hình ảnh
- 60 ảnh bìa PNG được đóng gói local, không phụ thuộc URL bên ngoài.
- Hero image local.
- Upload ảnh bìa/avatar từ thiết bị.
- Storage adapter local/S3 và CloudFront-ready URL.

## Nghiệp vụ
- User gửi yêu cầu trả; admin xác nhận tình trạng và tiền phạt.
- Gia hạn có phê duyệt.
- Đặt trước theo hàng đợi.
- Import/export danh mục sách.
- Export báo cáo mượn trả.
- Dashboard trend, alerts và notifications.

## Quản trị và bảo mật
- Account lock/rate limiting.
- Audit log và request ID.
- Mask dữ liệu cá nhân.
- IAM setup script được cập nhật cho Beanstalk, CloudFormation, Auto Scaling và S3.

## AWS
- S3/CloudFront-ready image storage.
- SES-ready password recovery.
- RDS-ready DATABASE_URL.
- Optional X-Ray.
- Optional SNS actions và Top API CloudWatch widget.
