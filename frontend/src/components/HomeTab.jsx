import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Clock, Search, X } from 'lucide-react';

function StatCard({ type, title, value, subtitle, icon }) {
  return (
    <div className={`stat-card stat-${type}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <p>{title}</p>
        <div className="stat-value-row"><strong>{value}</strong><span>{subtitle}</span></div>
      </div>
    </div>
  );
}

export default function HomeTab({ books, onBorrow }) {
  const [search, setSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // ==========================================
  // THÊM STATE VÀ LOGIC PHÂN TRANG (PAGINATION)
  // ==========================================
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 20; // Cố định 20 quyển 1 trang

  // 1. Lọc sách theo từ khóa tìm kiếm
  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  // 2. Tính toán vị trí cắt mảng
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const indexOfLastBook = currentPage * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  
  // 3. Lấy ra danh sách sách chỉ cho trang hiện tại
  const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook);

  // 4. Nếu gõ tìm kiếm, tự động quay về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">DASHBOARD</p>
          <h1>Library Borrowing System</h1>
          <p className="subtitle">Hệ thống quản lý kho sách tập trung.</p>
        </div>
      </section>
      
      <section className="stats-grid">
        <StatCard type="total" title="Tổng sách" value={books.length} subtitle="đầu sách" icon={<BookOpen size={28}/>} />
        <StatCard type="avail" title="Còn sẵn" value={books.filter(b => b.available).length} subtitle="quyển" icon={<CheckCircle2 size={28}/>} />
        <StatCard type="borrow" title="Đang mượn" value={books.filter(b => !b.available).length} subtitle="quyển" icon={<Clock size={28}/>} />
      </section>
      
      <section className="content-grid">
        <div className="panel">
          <div className="search-box" style={{ marginBottom: '20px' }}>
            <Search size={18} />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Tìm kiếm sách theo tên hoặc tác giả..." 
            />
          </div>
          
          <div className="book-list">
            {currentBooks.map((book) => (
              <div className="book-card" key={book.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', marginTop: '8px' }}>
                  {book.cover ? (
                    <img src={book.cover} alt={book.title} style={{ width: '130px', height: '190px', objectFit: 'cover', borderRadius: '8px' }} />
                  ) : (
                    <div style={{ width: '130px', height: '190px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '2px dashed #cbd5e1' }}><BookOpen size={40} /></div>
                  )}
                </div>
                
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span className={book.available ? 'badge available' : 'badge borrowed'}>
                      {book.available ? 'Có sẵn' : 'Đã mượn'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px 0', fontWeight: 800, color: '#0f172a', lineHeight: '1.4' }}>{book.title}</h3>
                  <p className="meta" style={{ margin: '0 0 16px 0', fontSize: '0.9rem' }}>{book.author}</p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button className="ghost-button" style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }} onClick={() => { setSelectedBook(book); setIsDetailOpen(true); }}>
                    Chi tiết
                  </button>
                  {book.available && (
                    <button className="primary-button" style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }} onClick={() => onBorrow(book)}>
                      Mượn
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* HIỂN THỊ TRỐNG NẾU KHÔNG TÌM THẤY */}
          {currentBooks.length === 0 && (
             <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
               Không tìm thấy cuốn sách nào phù hợp.
             </div>
          )}

          {/* BỘ NÚT ĐIỀU HƯỚNG PHÂN TRANG */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <button 
                className="ghost-button" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => prev - 1)}
                style={{ padding: '8px 16px', opacity: currentPage === 1 ? 0.5 : 1 }}
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
                style={{ padding: '8px 16px', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Trang tiếp
              </button>
            </div>
          )}

        </div>
      </section>

      {/* DRAWER CHI TIẾT SÁCH */}
      {isDetailOpen && selectedBook && (
        <>
          <div className="drawer-overlay" onClick={() => setIsDetailOpen(false)}></div>
          <div className="drawer-content">
            <div className="drawer-header">
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Chi tiết sách</h2>
              <button className="icon-btn-small" onClick={() => setIsDetailOpen(false)}><X size={24} /></button>
            </div>
            <div className="drawer-body">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                {selectedBook.cover ? (
                  <img src={selectedBook.cover} alt={selectedBook.title} style={{ width: '180px', height: '260px', objectFit: 'cover', borderRadius: '12px' }} />
                ) : (
                  <div style={{ width: '180px', height: '260px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '2px dashed #cbd5e1' }}><BookOpen size={48} /></div>
                )}
              </div>
              <h3 style={{ fontSize: '1.5rem', margin: '0 0 12px 0', color: '#0f172a', fontWeight: 800, textAlign: 'center' }}>{selectedBook.title}</h3>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
                <span className={`badge ${selectedBook.available ? 'available' : 'borrowed'}`}>{selectedBook.available ? 'Có sẵn' : 'Đã mượn'}</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>Tác giả:</strong> <span style={{ color: '#475569' }}>{selectedBook.author}</span></p>
                <p style={{ margin: '0' }}><strong>Mã số:</strong> <span className="font-mono" style={{ color: '#64748b' }}>#{selectedBook.id}</span></p>
              </div>
            </div>
            <div className="drawer-footer">
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="ghost-button" style={{ flex: 1 }} onClick={() => setIsDetailOpen(false)}>Đóng</button>
                {selectedBook.available && (
                  <button className="primary-button" style={{ flex: 2 }} onClick={() => { setIsDetailOpen(false); onBorrow(selectedBook); }}>Mượn sách này</button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}