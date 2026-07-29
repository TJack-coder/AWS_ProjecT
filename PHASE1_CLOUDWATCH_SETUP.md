# Giai đoạn 1 – CloudWatch observability

Bản này đã bổ sung phần source code và cấu hình triển khai cho giai đoạn CloudWatch:

- Structured JSON log cho mọi HTTP request, có `requestId`, `status_code`, `duration_ms`.
- Các event nghiệp vụ: `borrow_success`, `borrow_failed`, `return_success`, `return_failed`.
- Nginx healthd log để Elastic Beanstalk Enhanced Health đọc request count và latency.
- Elastic Beanstalk tự bật Enhanced Health, instance log streaming và health-event streaming.
- CloudWatch Agent thu thập `mem_used_percent` và `disk_used_percent`.
- Script tạo metric filters, alarms và dashboard.

## 1. Deploy ZIP lên Elastic Beanstalk

Upload ZIP này vào environment hiện tại với version label mới, ví dụ:

```text
sprint0-observability-v1
```

Chờ:

```text
Status: Ready
Health: Green / Ok
```

Không thêm `.env` vào ZIP. Giữ các Environment properties hiện có trên Elastic Beanstalk.

## 2. Chạy thiết lập AWS một lần trong CloudShell

Việc tạo IAM attachment, CloudWatch metric filters, alarms và dashboard là thay đổi cấp tài khoản AWS; source bundle không nên tự cấp các quyền này cho chính EC2. Sau khi deploy, upload cùng ZIP vào AWS CloudShell rồi chạy:

```bash
unzip aws-library-phase1-cloudwatch-ready.zip -d aws-library-phase1-cloudwatch
cd aws-library-phase1-cloudwatch

AWS_REGION=ap-southeast-2 \
EB_ENVIRONMENT=Aws-library-system-env \
EB_EC2_ROLE=aws-elasticbeanstalk-ec2-role \
bash cloudwatch/setup_phase1.sh
```

Script mặc định tạo:

```text
Metric namespace: AWSLibrary
System namespace: AWSLibrary/System
Dashboard: AWS-Library-System
```

Alarms:

```text
aws-library-high-cpu
aws-library-high-memory
aws-library-high-latency
aws-library-error-rate
```

Script có tính idempotent: có thể chạy lại để cập nhật cấu hình.

## 3. Tạo dữ liệu mới sau khi metric filters được tạo

Metric filters chỉ xử lý log phát sinh sau thời điểm tạo filter. Trên website hãy thực hiện:

```text
Đăng nhập
Mở danh sách sách
Mượn một sách
Trả sách
```

Chờ khoảng vài phút, sau đó vào:

```text
CloudWatch → Dashboards → AWS-Library-System
```

## 4. Kiểm tra tự động

Trong CloudShell:

```bash
AWS_REGION=ap-southeast-2 \
EB_ENVIRONMENT=Aws-library-system-env \
bash cloudwatch/verify_phase1.sh
```

## 5. Log group chính

Backend JSON logs được CloudWatch Agent gửi vào:

```text
/aws/aws-library/application
```

Container stdout và các log hệ thống Beanstalk vẫn nằm trong các log group có prefix:

```text
/aws/elasticbeanstalk/<environment>/
```

Nếu bạn chủ động đổi log group ứng dụng, truyền `APP_LOG_GROUP` khi chạy script.

## 6. Tiêu chí hoàn thành

```text
[ ] Environment Green
[ ] Có environment health logs
[ ] Có backend JSON logs
[ ] Log HTTP có requestId, status_code, duration_ms
[ ] Mượn sách sinh borrow_success
[ ] Trả sách sinh return_success
[ ] Có CPUUtilization
[ ] Có mem_used_percent
[ ] Có RequestCount
[ ] Có BorrowCount
[ ] Có Http5xxCount
[ ] Có RequestLatencyMs
[ ] Có 4 alarms
[ ] Có dashboard AWS-Library-System
```

## Lưu ý

- Không log password, JWT token, database password hoặc CCCD đầy đủ.
- `CloudWatchAgentServerPolicy` được script gắn vào role EC2 để gửi memory/disk metrics.
- Custom metrics, logs, alarms và dashboard có thể phát sinh chi phí CloudWatch.
- PostgreSQL vẫn đang nằm trong Docker container; chuyển RDS là giai đoạn riêng.
