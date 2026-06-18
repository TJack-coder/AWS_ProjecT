import React, { useState } from 'react';
import { libraryApi } from '../api';

export default function BorrowModal({ book, user, onClose, onRefresh }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: user?.fullName || '',
    phone: user?.phone || '',
    cccd: user?.cccd || '',
    borrowDate: new Date().toISOString().split('T')[0],
    returnDate: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConfirmBorrow = async () => {
    try {
      await libraryApi.borrowBook({
        book_id: book.id,
        customerName: formData.customerName,
        phone: formData.phone,
        cccd: formData.cccd,
        returnDate: formData.returnDate,
        deposit: 150000 
      });
      alert("Đã tạo phiếu mượn sách thành công!");
      onRefresh(); // Gọi hàm làm mới dữ liệu từ main.jsx
      onClose();   // Đóng modal
    } catch (error) {
      alert("Có lỗi xảy ra khi mượn sách: " + error.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {step === 1 ? (
          <>
            <h2>Mượn sách: {book.title}</h2>
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
              <input name="customerName" value={formData.customerName} onChange={handleChange} placeholder="Tên khách hàng" required />
              <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Số điện thoại" required />
              <input name="cccd" value={formData.cccd} onChange={handleChange} placeholder="Số CCCD" required />
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Ngày mượn</label>
                  <input type="date" name="borrowDate" value={formData.borrowDate} onChange={handleChange} required />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Ngày trả dự kiến</label>
                  <input type="date" name="returnDate" value={formData.returnDate} onChange={handleChange} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={onClose}>Hủy</button>
                <button type="submit" className="primary-button">Tiếp theo</button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2>Xác nhận thanh toán</h2>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#475569' }}>Phí mượn sách:</span><strong>50.000 VNĐ</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#475569' }}>Tiền cọc:</span><strong>100.000 VNĐ</strong>
              </div>
              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', color: '#0f172a' }}>
                <span><strong>Tổng cộng:</strong></span><strong style={{ color: '#e11d48' }}>150.000 VNĐ</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setStep(1)}>Quay lại</button>
              <button className="primary-button" onClick={handleConfirmBorrow}>Hoàn tất mượn</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

