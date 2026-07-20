import React, { useState } from 'react';
import { Library } from 'lucide-react';
import { libraryApi } from './api';

export default function Auth({ onLoginSuccess }) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '', 
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Gọi API đăng nhập
      const res = await libraryApi.login(formData.username, formData.password);
      
      // Chặn ngay từ cửa nếu tài khoản không phải là admin
      if (res.user.role !== 'admin') {
         throw new Error('Từ chối truy cập: Chỉ tài khoản Quản trị viên (Thủ thư) mới được phép sử dụng hệ thống này.');
      }
      
      onLoginSuccess(res);
    } catch (err) {
      setError(err.message || 'Sai tên đăng nhập hoặc mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#cbd5e1', padding: '20px' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
          <Library size={32} style={{ color: '#1e293b' }} />
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>Thư Viện Nội Bộ</h1>
        </div>

        <h2 style={{ textAlign: 'center', margin: '0 0 20px 0', fontSize: '1.2rem', color: '#64748b' }}>
          Đăng nhập hệ thống quản lý
        </h2>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="text" name="username" placeholder="Tên đăng nhập Admin *" required
            value={formData.username} onChange={handleChange} 
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc' }} 
          />
          
          <input 
            type="password" name="password" placeholder="Mật khẩu *" required
            value={formData.password} onChange={handleChange} 
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc' }} 
          />

          <button type="submit" className="primary-button" disabled={isLoading} style={{ padding: '14px', fontSize: '1rem', marginTop: '8px', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: '#94a3b8' }}>
          Tài khoản mặc định hệ thống: <strong>admin / admin123</strong>
        </div>
      </div>
    </div>
  );
}