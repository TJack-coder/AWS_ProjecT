import React, { useState } from 'react';
import { X } from 'lucide-react';
import { libraryApi } from '../api';

export default function BorrowModal({ books, user, onClose, onRefresh }) {
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
      // Gửi request cho từng cuốn sách trong giỏ
      await Promise.all(books.map(book => 
        libraryApi.borrowBook({
          book_id: book.id,
          customerName: formData.customerName,
          phone: formData.phone,
          cccd: formData.cccd,
          returnDate: formData.returnDate,
          deposit: 150000 // Bạn có thể tùy chỉnh phí này
        })
      ));
      
      alert(`Đã tạo phiếu mượn thành công cho ${books.length} quyển sách!`);
      onRefresh(); 
      onClose();
    } catch (error) {
      alert("Lỗi khi tạo phiếu mượn: " + error.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {step === 1 ? (
          <>
            <h2>Mượn {books.length} quyển sách</h2>
            <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>
              <strong>Danh sách: </strong> {books.map(b => b.title).join(', ')}
            </div>
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
              <input name="customerName" value={formData.customerName} onChange={handleChange} placeholder="Tên khách hàng" required />
              <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Số điện thoại" required />
              <input name="cccd" value={formData.cccd} onChange={handleChange} placeholder="Số CCCD" required />
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Ngày mượn</label>
                  <input type="date" name="borrowDate" value={formData.borrowDate} onChange={handleChange} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Ngày trả dự kiến</label>
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
              <p>Tổng số sách: <strong>{books.length} quyển</strong></p>
              <p style={{ color: '#e11d48', fontSize: '1.2rem', fontWeight: 800 }}>
                Tổng tiền cọc: {(books.length * 150000).toLocaleString()} VNĐ
              </p>
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