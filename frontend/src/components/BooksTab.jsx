import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Filter } from 'lucide-react';
import { libraryApi } from '../api';

export default function BooksTab({ books, onRefresh }) {
  // State quản lý Modal thêm và xóa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [newBook, setNewBook] = useState({ title: '', author: '', category: '', cover: '', description: '' });

  // State cho Tìm kiếm và Lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // State cho Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;

  // --- XỬ LÝ LỌC VÀ TÌM KIẾM ---
  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          book.id.toString() === searchTerm;
    
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'available' && book.available) ||
                          (filterStatus === 'borrowed' && !book.available);
                          
    return matchesSearch && matchesStatus;
  });

  // --- XỬ LÝ PHÂN TRANG ---
  const totalPages = Math.ceil(filteredBooks.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentBooks = filteredBooks.slice(indexOfFirstRecord, indexOfLastRecord);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // --- CÁC HÀM XỬ LÝ API ---
  const handleInputChange = (e) => setNewBook(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await libraryApi.createBook(newBook);
      alert("Đã thêm sách thành công!");
      setIsModalOpen(false);
      setNewBook({ title: '', author: '', category: '', cover: '', description: '' });
      onRefresh();
    } catch (error) {
      alert("Lỗi khi thêm sách: " + error.message);
    }
  };

  const confirmDelete = async () => {
    try {
      await libraryApi.deleteBook(bookToDelete.id);
      alert("Đã xóa sách thành công!");
      setBookToDelete(null);
      onRefresh();
    } catch (error) {
      alert("Lỗi khi xóa: " + error.message);
    }
  };

  return (
    <div className="books-page">
      <div className="page-header">
        <div><h2>Danh mục Kho Sách</h2></div>
        <button className="primary-button" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Nhập sách mới
        </button>
      </div>

      {/* THỐNG KÊ NHANH (Đã gắn hiệu ứng stat-bubble và chỉ có 1 hàng duy nhất) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div className="stat-bubble" style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>Tổng số đầu sách</span>
          <strong style={{ display: 'block', fontSize: '2rem', color: '#0f172a', marginTop: '8px' }}>{books.length}</strong>
        </div>
        <div className="stat-bubble" style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>Có sẵn trong kho</span>
          <strong style={{ display: 'block', fontSize: '2rem', color: '#10b981', marginTop: '8px' }}>{books.filter(b => b.available).length}</strong>
        </div>
        <div className="stat-bubble" style={{ background: '#fff1f2', padding: '24px', borderRadius: '16px', border: '1px solid #fecdd3' }}>
          <span style={{ color: '#e11d48', fontWeight: 700 }}>Đang cho mượn</span>
          <strong style={{ display: 'block', fontSize: '2rem', color: '#f59e0b', marginTop: '8px' }}>{books.filter(b => !b.available).length}</strong>
        </div>
      </div>

      <div className="panel no-pad">
        {/* Thanh công cụ Tìm kiếm & Lọc */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '250px', margin: 0 }}>
            <Search size={18} />
            <input 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Tìm theo Tên sách, Tác giả hoặc Mã sách..." 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Filter size={18} color="#64748b" />
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: '#0f172a', fontWeight: 500, cursor: 'pointer' }}
            >
              <option value="all">Tất cả sách</option>
              <option value="available">Chỉ sách có sẵn</option>
              <option value="borrowed">Sách đang cho mượn</option>
            </select>
          </div>
        </div>

        {/* Bảng danh sách */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã Sách</th>
                <th>Tên sách</th>
                <th>Tác giả</th>
                <th>Thể loại</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {currentBooks.map(b => (
                <tr key={b.id}>
                  <td className="font-mono" style={{ color: '#64748b' }}>#{b.id}</td>
                  <td><strong>{b.title}</strong></td>
                  <td>{b.author}</td>
                  <td>{b.category}</td>
                  <td>
                    <span className={`badge ${b.available ? 'available' : 'borrowed'}`}>
                      {b.available ? 'Có sẵn' : 'Đang mượn'}
                    </span>
                  </td>
                  <td className="action-cell">
                    <button className="icon-btn-small delete" onClick={() => setBookToDelete(b)} title="Xóa sách">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {currentBooks.length === 0 && (
                 <tr><td colSpan="6" style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Không tìm thấy sách nào khớp với điều kiện.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Nút Phân trang Kho Sách */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '20px', borderTop: '1px solid #e2e8f0' }}>
            <button 
              className="ghost-button" 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Trang trước
            </button>
            <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.95rem' }}>
              Trang {currentPage} / {totalPages}
            </span>
            <button 
              className="primary-button" 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Trang tiếp
            </button>
          </div>
        )}
      </div>

      {/* MODAL THÊM SÁCH */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Nhập sách mới vào kho</h2>
            <form onSubmit={handleAddSubmit} className="modal-form">
              <input name="title" placeholder="Tên sách (* Bắt buộc)" value={newBook.title} onChange={handleInputChange} required />
              <input name="author" placeholder="Tên tác giả (* Bắt buộc)" value={newBook.author} onChange={handleInputChange} required />
              <input name="category" placeholder="Thể loại" value={newBook.category} onChange={handleInputChange} />
              <input name="cover" placeholder="Link ảnh bìa sách (URL) - Tùy chọn" value={newBook.cover} onChange={handleInputChange} />
              <textarea name="description" placeholder="Mô tả nội dung sách..." value={newBook.description} onChange={handleInputChange} rows="3" />
              <div className="modal-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button type="button" className="ghost-button" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button">Lưu sách</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {bookToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Xác nhận xóa sách</h2>
            <p>Bạn có chắc chắn muốn xóa cuốn <strong>"{bookToDelete.title}"</strong> khỏi hệ thống không? Hành động này không thể hoàn tác.</p>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setBookToDelete(null)}>Hủy</button>
              <button className="primary-button" style={{background: '#ef4444'}} onClick={confirmDelete}>Xác nhận xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}