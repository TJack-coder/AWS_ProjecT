import React, { useState } from 'react';
import {
  BookOpenCheck,
  Eye,
  EyeOff,
  Library,
  LockKeyhole,
  ShieldCheck,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { libraryApi } from './api';

export default function Auth({ onLoginSuccess, initialError = '' }) {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotIdentity, setForgotIdentity] = useState('');
  const resetToken = new URLSearchParams(window.location.search).get('token');
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' });
  const [form, setForm] = useState({ username: '', password: '', fullName: '', email: '', phone: '', cccd: '' });

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const response = mode === 'login'
        ? await libraryApi.login(form.username, form.password)
        : await libraryApi.register(form);
      onLoginSuccess(response, remember);
    } catch (submitError) {
      setError(submitError.message || 'Không thể xác thực tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await libraryApi.forgotPassword(forgotIdentity);
      setNotice(response.emailSent
        ? 'Hướng dẫn đặt lại mật khẩu đã được gửi qua email.'
        : 'Yêu cầu đã được ghi nhận. Nếu hệ thống chưa cấu hình email, vui lòng liên hệ quản trị viên.');
      setForgotOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setError('');
    if (resetForm.password.length < 8) { setError('Mật khẩu mới phải có ít nhất 8 ký tự.'); return; }
    if (resetForm.password !== resetForm.confirm) { setError('Hai mật khẩu chưa khớp.'); return; }
    setLoading(true);
    try {
      await libraryApi.resetPassword(resetToken, resetForm.password);
      setNotice('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.');
      window.history.replaceState({}, '', '/login');
      setMode('login');
    } catch (resetError) { setError(resetError.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand"><Library size={28} /><span>CloudLibrary</span></div>
        <div className="auth-copy">
          <p className="eyebrow">AWS LIBRARY BORROWING SYSTEM</p>
          <h1>Một thư viện số gọn gàng cho cả quản trị viên và độc giả.</h1>
          <p>Quản lý kho sách, ảnh bìa, QR, đặt trước, mượn trả, gia hạn, cảnh báo quá hạn và báo cáo trong cùng một ứng dụng.</p>
          <div className="auth-benefits">
            <div><BookOpenCheck size={22} /><span><strong>Kho sách trực quan</strong><small>Tìm kiếm, lọc, phân trang và xem QR.</small></span></div>
            <div><ShieldCheck size={22} /><span><strong>Quy trình an toàn</strong><small>Độc giả gửi yêu cầu, thủ thư kiểm tra và xác nhận.</small></span></div>
            <div><UserRoundPlus size={22} /><span><strong>Đăng ký nhanh</strong><small>Tạo tài khoản độc giả ngay trên website.</small></span></div>
          </div>
        </div>
        <div className="auth-legal">© 2026 CloudLibrary · Chính sách bảo mật · Điều khoản sử dụng</div>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          <div className="auth-mobile-brand"><Library size={26} /><span>CloudLibrary</span></div>
          {resetToken ? <>
            <div className="auth-heading"><h2>Đặt lại mật khẩu</h2><p>Tạo mật khẩu mới cho tài khoản của bạn.</p></div>
            {error && <div className="form-error">{error}</div>}{notice && <div className="form-notice">{notice}</div>}
            <form className="auth-form" onSubmit={submitReset}>
              <label>Mật khẩu mới<span className="password-field"><input type={showPassword ? 'text' : 'password'} value={resetForm.password} onChange={(e)=>setResetForm((v)=>({...v,password:e.target.value}))} minLength="8" required/><button type="button" onClick={()=>setShowPassword((v)=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
              <label>Xác nhận mật khẩu<input type="password" value={resetForm.confirm} onChange={(e)=>setResetForm((v)=>({...v,confirm:e.target.value}))} minLength="8" required/></label>
              <button className="primary-button auth-submit" disabled={loading}>{loading?'Đang cập nhật...':'Đặt lại mật khẩu'}</button>
              {notice && <button type="button" className="ghost-button" onClick={()=>window.location.assign('/login')}>Về trang đăng nhập</button>}
            </form>
          </> : <>
          <div className="auth-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Đăng nhập</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Tạo tài khoản</button>
          </div>
          <div className="auth-heading">
            <h2>{mode === 'login' ? 'Chào mừng trở lại' : 'Đăng ký độc giả mới'}</h2>
            <p>{mode === 'login' ? 'Đăng nhập để tiếp tục sử dụng thư viện.' : 'Tài khoản mới sẽ có quyền độc giả.'}</p>
          </div>

          {error && <div className="form-error">{error}</div>}
          {notice && <div className="form-notice">{notice}</div>}

          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && (
              <>
                <label>Họ và tên<input name="fullName" value={form.fullName} onChange={change} placeholder="Nguyễn Văn A" required /></label>
                <label>Email<input type="email" name="email" value={form.email} onChange={change} placeholder="name@example.com" /></label>
                <div className="form-row">
                  <label>Số điện thoại<input name="phone" value={form.phone} onChange={change} placeholder="09xxxxxxxx" /></label>
                  <label>CCCD<input name="cccd" value={form.cccd} onChange={change} placeholder="12 chữ số" /></label>
                </div>
              </>
            )}
            <label>Tên đăng nhập<input name="username" value={form.username} onChange={change} placeholder="Nhập tên đăng nhập" autoComplete="username" required /></label>
            <label>Mật khẩu
              <span className="password-field">
                <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={change} placeholder="Tối thiểu 8 ký tự" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" required />
                <button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            {mode === 'login' && (
              <div className="auth-options">
                <label className="check-control"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />Ghi nhớ đăng nhập</label>
                <button type="button" className="link-button" onClick={() => setForgotOpen(true)}>Quên mật khẩu?</button>
              </div>
            )}
            <button className="primary-button auth-submit" type="submit" disabled={loading}>
              {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </button>
          </form>
          <div className="auth-security-note"><LockKeyhole size={16} /><span>Thông tin đăng nhập được truyền qua kết nối bảo mật khi HTTPS được bật.</span></div>
          </>}
        </div>
      </section>

      {forgotOpen && (
        <div className="modal-overlay" onClick={() => setForgotOpen(false)}>
          <div className="modal-content compact-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setForgotOpen(false)}><X size={20} /></button>
            <div className="modal-heading"><p className="eyebrow dark">PASSWORD RECOVERY</p><h2>Khôi phục mật khẩu</h2><p>Nhập tên đăng nhập hoặc email đã đăng ký.</p></div>
            <form className="modal-form" onSubmit={requestReset}>
              <label>Tài khoản hoặc email<input value={forgotIdentity} onChange={(event) => setForgotIdentity(event.target.value)} required /></label>
              <button className="primary-button" disabled={loading}>{loading ? 'Đang gửi...' : 'Gửi hướng dẫn'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
