# Hướng dẫn CloudWatch sau khi deploy

## A. Bắt buộc trước khi có metric RAM

Vào:

```text
IAM → Roles → aws-elasticbeanstalk-ec2-role → Add permissions
```

Gắn policy:

```text
CloudWatchAgentServerPolicy
```

Có thể bỏ qua thao tác tay này nếu chạy `cloudwatch/setup_phase1.sh`, vì script sẽ gắn policy tự động.

## B. Cách nhanh: chạy script trong AWS CloudShell

1. Chờ Elastic Beanstalk ở trạng thái `Ready` và `Green/Ok`.
2. Mở AWS CloudShell tại region `ap-southeast-2`.
3. Upload chính file ZIP deployment vào CloudShell.
4. Chạy:

```bash
unzip aws-library-phase1-cloudwatch-ready.zip -d aws-library-phase1
cd aws-library-phase1

AWS_REGION=ap-southeast-2 \
EB_ENVIRONMENT=Aws-library-system-env \
EB_EC2_ROLE=aws-elasticbeanstalk-ec2-role \
bash cloudwatch/setup_phase1.sh
```

Script tạo/cập nhật:

- Log retention 7 ngày.
- Metric filters: `RequestCount`, `BorrowCount`, `Http5xxCount`, `RequestLatencyMs`.
- Alarms: CPU, RAM, p95 latency, error rate.
- Dashboard: `AWS-Library-System`.

## C. Tạo traffic mới

Metric filters không xử lý log cũ. Sau khi script hoàn tất, vào website và thực hiện:

```text
Đăng nhập → mở danh sách sách → mượn một sách → trả sách
```

Chờ khoảng 3–10 phút.

## D. Xem log

Vào:

```text
CloudWatch → Logs → Log groups
```

Log ứng dụng JSON:

```text
/aws/aws-library/application
```

Các log Elastic Beanstalk mặc định có prefix:

```text
/aws/elasticbeanstalk/Aws-library-system-env/
```

Trong log group ứng dụng, dùng Logs Insights:

```sql
fields @timestamp, service, event, requestId, method, path, status_code, duration_ms, book_id, user_id
| filter service = "library-flask-api"
| sort @timestamp desc
| limit 100
```

## E. Xem và chỉnh metric

Vào:

```text
CloudWatch → Metrics → All metrics
```

Custom namespaces:

```text
AWSLibrary
AWSLibrary/System
```

Các metric chính:

```text
AWSLibrary/RequestCount
AWSLibrary/BorrowCount
AWSLibrary/Http5xxCount
AWSLibrary/RequestLatencyMs
AWSLibrary/System/mem_used_percent
AWSLibrary/System/disk_used_percent
```

## F. Chỉnh alarm

Vào:

```text
CloudWatch → Alarms → All alarms
```

Mở từng alarm → `Actions` → `Edit`:

```text
aws-library-high-cpu       : CPU > 80%, 2/2 chu kỳ 5 phút
aws-library-high-memory    : RAM > 85%, 2/2 chu kỳ 5 phút
aws-library-high-latency   : p95 > 1000 ms, 2/3 chu kỳ 5 phút
aws-library-error-rate     : HTTP 5xx / request > 5%, 2/2 chu kỳ 5 phút
```

Để nhận email, tạo SNS topic trong bước Notification của alarm và xác nhận email AWS gửi tới.

## G. Chỉnh dashboard

Vào:

```text
CloudWatch → Dashboards → AWS-Library-System
```

Chọn `Actions → Edit` để đổi kích thước, khoảng thời gian hoặc thêm widget.

## H. Kiểm tra tự động

Trong CloudShell:

```bash
AWS_REGION=ap-southeast-2 \
EB_ENVIRONMENT=Aws-library-system-env \
bash cloudwatch/verify_phase1.sh
```

## Lưu ý

- Khi EC2 instance bị thay thế, CPU/RAM alarm và dashboard đang dùng `InstanceId` cũ. Chạy lại `setup_phase1.sh` để cập nhật sang instance mới.
- Custom logs, custom metrics, alarms và dashboard có thể phát sinh chi phí CloudWatch.
- Không đưa `.env` thật vào ZIP.
