import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CreditCard, UserRound, X } from 'lucide-react';
import { libraryApi, mediaUrl } from '../api';

function defaultDueDate() {
  const value = new Date();
  value.setDate(value.getDate() + 14);
  return value.toISOString().split('T')[0];
}

export default function BorrowModal({ books, user, onClose, onRefresh }) {
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    userId: user?.id || '',
    customerName: user?.fullName || user?.username || '',
    phone: user?.phone || '',
    cccd: user?.cccd || '',
    returnDate: defaultDueDate(),
    deposit: 150000,
  });

  useEffect(() => {
    if (user?.role !== 'admin') return;
    libraryApi.getUsers()
      .then((data) => {
        setUsers(data);
        const current = data.find((item) => item.id === user.id) || data[0];
        if (current) selectUser(current.id, data);
      })
      .catch((loadError) => setError(loadError.message));
  }, [user?.role]);

  const selectedUser = useMemo(
    () => users.find((item) => String(item.id) === String(form.userId)),
    [users, form.userId],
  );

  const selectUser = (userId, source = users) => {
    const selected = source.find((item) => String(item.id) === String(userId));
    setForm((current) => ({
      ...current,
      userId,
      customerName: selected?.fullName || selected?.username || '',
      phone: selected?.phone || '',
      cccd: selected?.cccd || '',
    }));
  };

  const change = (event) => {
    const { name, value } = event.target;
    if (name === 'userId') selectUser(value);
    else setForm((current) => ({ ...current, [name]: value }));
  };

  const continueToConfirm = (event) => {
    event.preventDefault();
    setError('');
    const due = new Date(`${form.returnDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!form.returnDate || due <= today) {
      setError('Ngày trả dự kiến phải sau ngày hôm nay.');
      return;
    }
    if (user.role === 'admin' && !form.userId) {
      setError('Vui lòng chọn độc giả.');
      return;
    }
    setStep(2);
  };

  const confirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      for (const book of books) {
        await libraryApi.borrowBook({
          book_id: book.id,
          user_id: user.role === 'admin' ? Number(form.userId) : user.id,
          customerName: form.customerName,
          phone: form.phone,
          cccd: form.cccd,
          returnDate: form.returnDate,
          deposit: Number(form.deposit || 0),
        });
      }
      await onRefresh();
      onClose();
    } catch (submitError) {
      setError(submitError.message || 'Không thể tạo phiếu mượn.');
      setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  const totalDeposit = Number(form.deposit || 0) * books.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content borrow-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={21} /></button>
        <div className="step-indicator"><span className={step >= 1 ? 'active' : ''}>1</span><i /><span className={step >= 2 ? 'active' : ''}>2</span></div>

        {step === 1 ? (
          <>
            <div className="modal-heading"><p className="eyebrow dark">BORROW CHECKOUT</p><h2>Tạo phiếu mượn</h2><p>{books.map((book) => book.title).join(', ')}</p></div>
            {error && <div className="form-error">{error}</div>}
            <form className="modal-form" onSubmit={continueToConfirm}>
              {user.role === 'admin' ? (
                <label>Chọn độc giả<select name="userId" value={form.userId} onChange={change} required><option value="">-- Chọn tài khoản --</option>{users.map((item) => <option key={item.id} value={item.id}>{item.fullName || item.username} · {item.username}</option>)}</select></label>
              ) : (
                <div className="selected-reader"><UserRound size={22} /><div><strong>{user.fullName || user.username}</strong><small>Tài khoản độc giả hiện tại</small></div></div>
              )}
              {user.role === 'admin' ? <>
                <div className="form-row"><label>Họ và tên<input name="customerName" value={form.customerName} onChange={change} required readOnly /></label><label>Số điện thoại<input name="phone" value={form.phone} readOnly /></label></div>
                <div className="form-row"><label>CCCD<input name="cccd" value={form.cccd} readOnly /></label><label>Ngày trả dự kiến<input type="date" name="returnDate" value={form.returnDate} onChange={change} min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} required /></label></div>
              </> : <>
                <div className="reader-profile-summary"><span><small>Họ và tên</small><strong>{form.customerName}</strong></span><span><small>Số điện thoại</small><strong>{form.phone || 'Chưa cập nhật'}</strong></span><span><small>CCCD</small><strong>{form.cccd || 'Chưa cập nhật'}</strong></span></div>
                <label>Ngày trả dự kiến<input type="date" name="returnDate" value={form.returnDate} onChange={change} min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} required /></label>
              </>}
              <label>Tiền cọc mỗi sách (VNĐ)<input type="number" name="deposit" value={form.deposit} onChange={change} min="0" step="10000" /></label>
              <div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>Hủy</button><button type="submit" className="primary-button">Kiểm tra phiếu</button></div>
            </form>
          </>
        ) : (
          <>
            <div className="modal-heading"><p className="eyebrow dark">CONFIRMATION</p><h2>Xác nhận mượn sách</h2><p>Kiểm tra lại thông tin trước khi hoàn tất.</p></div>
            <div className="checkout-summary">
              <div><UserRound size={20} /><span><small>Độc giả</small><strong>{form.customerName || selectedUser?.username}</strong></span></div>
              <div><CalendarDays size={20} /><span><small>Hạn trả</small><strong>{form.returnDate}</strong></span></div>
              <div><BookIcon /><span><small>Số lượng</small><strong>{books.length} quyển</strong></span></div>
              <div><CreditCard size={20} /><span><small>Tổng tiền cọc</small><strong>{totalDeposit.toLocaleString('vi-VN')} VNĐ</strong></span></div>
            </div>
            <div className="borrowed-book-preview">{books.map((book) => <div key={book.id}>{book.cover ? <img src={mediaUrl(book.cover)} alt="" /> : <span>📘</span>}<div><strong>{book.title}</strong><small>Còn {book.availableQuantity}/{book.totalQuantity} bản trước giao dịch</small></div></div>)}</div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions"><button className="ghost-button" onClick={() => setStep(1)}>Quay lại</button><button className="primary-button" disabled={submitting} onClick={confirm}>{submitting ? 'Đang tạo phiếu...' : 'Hoàn tất mượn'}</button></div>
          </>
        )}
      </div>
    </div>
  );
}

function BookIcon() {
  return <span className="emoji-icon">📚</span>;
}
