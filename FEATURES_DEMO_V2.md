# Danh sách chức năng Demo V2

## 1. Phân quyền admin và user

- Admin quản lý sách, xem tất cả phiếu, chọn độc giả khi lập phiếu mượn.
- User tự đăng ký, xem kho sách, mượn sách, xem “Sách của tôi”, trả và gia hạn phiếu của chính mình.
- Backend kiểm tra JWT và role ở từng endpoint.

## 2. CRUD sách đầy đủ

- Create: tên, tác giả, thể loại, ISBN, nhà xuất bản, năm xuất bản, kệ, ảnh, mô tả và số lượng.
- Read: card, bảng quản trị và drawer chi tiết.
- Update: sửa metadata và tăng/giảm số lượng hợp lệ.
- Delete: lưu trữ mềm để không mất lịch sử.
- Restore: khôi phục sách đã lưu trữ.

## 3. Tìm kiếm, lọc, sắp xếp và phân trang

- Tìm theo tên, tác giả, thể loại, ISBN, vị trí kệ hoặc ID.
- Lọc theo thể loại, còn bản, tạm hết, đang hoạt động hoặc lưu trữ.
- Sắp xếp A–Z, phổ biến, mới nhập, nhiều bản và lượt mượn.
- Phân trang ở kho sách, quản lý sách và lịch sử.

## 4. Quản lý số lượng bản

- `totalQuantity`: tổng số bản.
- `availableQuantity`: số còn trong kho.
- `borrowedQuantity`: số đang mượn.
- Mượn giảm một bản; trả tăng một bản.
- Không cho giảm tổng số xuống thấp hơn số bản đang mượn.

## 5. Mượn, trả và gia hạn

- Admin chọn đúng user thay vì gắn phiếu cho admin.
- Ngày trả phải sau ngày hiện tại.
- Gia hạn thêm 7 ngày, tối đa 2 lần.
- Phiếu quá hạn không được gia hạn.
- Lưu tiền cọc theo đơn vị VNĐ.

## 6. Sách của tôi

- User xem phiếu đang mượn, sắp đến hạn, quá hạn và đã trả.
- Tìm kiếm, lọc ngày, phân trang, xem chi tiết và thao tác gia hạn/trả.

## 7. Cảnh báo quá hạn

- Bell notification trên thanh điều hướng.
- Banner quá hạn trong trang Sách của tôi/Mượn trả.
- Dashboard hiển thị cảnh báo ưu tiên.
- Badge phân biệt đang mượn, sắp hạn, quá hạn và đã trả.

## 8. Dashboard thống kê

- Tổng đầu sách và tổng bản sách.
- Số bản sẵn sàng, số bản đang mượn.
- Phiếu hoạt động, quá hạn và đã trả.
- Tổng user dành cho admin.
- Phân bố thể loại, top sách và hoạt động gần đây.

## 9. QR sách

- Backend sinh PNG bằng thư viện `qrcode`.
- QR chứa URL website `/?book=<id>`.
- Sau đăng nhập, website tự mở drawer chi tiết đúng đầu sách.

## 10. Gợi ý sách đơn giản

- Ưu tiên thể loại user đã từng mượn.
- Cộng điểm cho sách chưa từng mượn và sách phổ biến.
- Khi user chưa có lịch sử, hiển thị sách phổ biến hoặc mới.

## 11. 60 đầu sách demo

- Seed idempotent trong `backend/seed_data.py`.
- Có các nhóm Programming, AI, Cloud, DevOps, Database, Algorithms, Operating Systems, Data Science và Project Management.
- Mỗi sách có từ 3 đến 8 bản và mã vị trí kệ.
