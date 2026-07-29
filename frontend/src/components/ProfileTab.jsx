import React, { useState } from 'react';
import { Camera, KeyRound, Save, ShieldCheck, UserRound } from 'lucide-react';
import { libraryApi, mediaUrl } from '../api';

export default function ProfileTab({ user, onUserChange }) {
  const [form, setForm] = useState({
    fullName: user.fullName || '', email: user.email || '', phone: user.phone || '', cccd: user.cccd || '',
    avatar: user.avatar || '', currentPassword: '', newPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const result = await libraryApi.uploadImage(file);
      setForm((current) => ({ ...current, avatar: result.url }));
    } catch (uploadError) { setError(uploadError.message); }
    finally { setSaving(false); }
  };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const updated = await libraryApi.updateProfile(form);
      onUserChange(updated);
      setForm((current) => ({ ...current, currentPassword: '', newPassword: '' }));
      setMessage('Hồ sơ đã được cập nhật.');
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  };

  return <div className="profile-page">
    <div className="page-header"><div><p className="eyebrow dark">ACCOUNT & PRIVACY</p><h1>Hồ sơ cá nhân</h1><p>Cập nhật thông tin liên hệ và bảo mật tài khoản.</p></div></div>
    <div className="profile-layout">
      <section className="panel profile-card">
        <div className="avatar-large">
          {form.avatar ? <img src={mediaUrl(form.avatar)} alt="Ảnh đại diện" /> : <UserRound size={52} />}
        </div>
        <h2>{user.fullName || user.username}</h2><p>@{user.username}</p>
        <span className={`badge ${user.role === 'admin' ? 'admin' : 'available'}`}>{user.role === 'admin' ? 'Quản trị viên' : 'Độc giả'}</span>
        <label className="upload-button"><Camera size={17} /> Chọn ảnh từ máy<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} /></label>
        <div className="privacy-note"><ShieldCheck size={18} /><span>CCCD và số điện thoại được che khi hiển thị ở danh sách công việc.</span></div>
      </section>
      <section className="panel">
        <form className="profile-form" onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}{message && <div className="form-notice">{message}</div>}
          <div className="form-row"><label>Họ và tên<input name="fullName" value={form.fullName} onChange={change} required /></label><label>Email<input type="email" name="email" value={form.email} onChange={change} /></label></div>
          <div className="form-row"><label>Số điện thoại<input name="phone" value={form.phone} onChange={change} /></label><label>CCCD<input name="cccd" value={form.cccd} onChange={change} /></label></div>
          <div className="section-divider"><KeyRound size={18} /><strong>Đổi mật khẩu</strong><span>Để trống nếu không muốn thay đổi</span></div>
          <div className="form-row"><label>Mật khẩu hiện tại<input type="password" name="currentPassword" value={form.currentPassword} onChange={change} /></label><label>Mật khẩu mới<input type="password" name="newPassword" value={form.newPassword} onChange={change} minLength="8" /></label></div>
          <div className="modal-actions"><button className="primary-button" disabled={saving}><Save size={17}/>{saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</button></div>
        </form>
      </section>
    </div>
  </div>;
}
