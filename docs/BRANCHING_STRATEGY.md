# Branching Strategy

Sprint 0 dùng quy trình branch đơn giản:

- `main`: code ổn định, có thể deploy.
- `develop`: code đang phát triển, merge từ các feature branch.
- `feature/*`: mỗi tính năng tạo một branch riêng, ví dụ `feature/books-crud`.
- `hotfix/*`: sửa lỗi khẩn cấp từ production.

Khuyến nghị:

1. Không push trực tiếp lên `main`.
2. Mỗi thay đổi cần tạo Pull Request.
3. PR cần được review trước khi merge.
4. Không commit secret như AWS key, DB password.
