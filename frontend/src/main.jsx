import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, CheckCircle2, Clock, Plus, Search, X, Home, Library, History as HistoryIcon, User, Trash2 } from 'lucide-react';
import { libraryApi } from './api';
import './styles.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false); 
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [borrowStep, setBorrowStep] = useState(1);
  
  // -- STATE CHO LỊCH SỬ MƯỢN TRẢ --
  // Thêm sẵn 1 data mẫu để bạn dễ nhìn thiết kế bảng
  const [history, setHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [borrowData, setBorrowData] = useState({
    customerName: '', phone: '', cccd: '', address: '', bookId: '', bookTitle: '', borrowDate: '', returnDate: ''
  });

  const [newBook, setNewBook] = useState({ title: '', author: '', category: '', cover: '', description: '' });

  const loadData = async () => {
    try {
      const data = await libraryApi.getBooks();
      setBooks(data);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBook(prev => ({ ...prev, [name]: value }));
  };

  const handleBorrowInputChange = (e) => {
    const { name, value } = e.target;
    setBorrowData(prev => ({ ...prev, [name]: value }));
  };

  const openBorrowModal = (book) => {
    setBorrowData({
      customerName: '', phone: '', cccd: '', address: '',
      bookId: book.id, bookTitle: book.title,
      borrowDate: new Date().toISOString().split('T')[0], returnDate: ''
    });
    setBorrowStep(1); 
    setIsBorrowModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await libraryApi.createBook(newBook);
      alert("Đã thêm sách thành công!");
      setIsModalOpen(false);
      setNewBook({ title: '', author: '', category: '', cover: '', description: '' });
      loadData();
    } catch (error) {
      alert("Lỗi khi thêm sách: " + error.message);
    }
  };

  // --- LOGIC HOÀN TẤT MƯỢN SÁCH MỚI ---
  const handleConfirmBorrow = async (e) => {
    e.preventDefault();
    try {
      await libraryApi.updateBookStatus(borrowData.bookId, { available: false });
      
      // Tạo một record mới đẩy vào History
      const newRecord = {
        id: `BR${Math.floor(1000 + Math.random() * 9000)}`, // Random ID ví dụ: BR4021
        bookId: borrowData.bookId,
        bookTitle: borrowData.bookTitle,
        customerName: borrowData.customerName,
        phone: borrowData.phone,
        cccd: borrowData.cccd,
        borrowDate: borrowData.borrowDate,
        returnDate: borrowData.returnDate,
        status: 'active', // 'active' (đang mượn) hoặc 'returned' (đã trả)
        deposit: 100000 // Tiền cọc mặc định theo UI
      };
      
      setHistory(prev => [newRecord, ...prev]); // Đẩy lên đầu danh sách

      alert("Đã mượn sách thành công!");
      setIsBorrowModalOpen(false);
      loadData(); 
    } catch (error) {
      alert("Có lỗi xảy ra: " + error.message);
    }
  };

  // --- LOGIC NHẬN TRẢ SÁCH ---
  const handleReturnBook = async (record) => {
    if(window.confirm(`Xác nhận khách [${record.customerName}] đã trả lại cuốn [${record.bookTitle}] và bạn đã hoàn cọc?`)) {
      try {
        await libraryApi.updateBookStatus(record.bookId, { available: true }); // Mở khóa sách
        // Cập nhật trạng thái trong lịch sử
        setHistory(prev => prev.map(item => item.id === record.id ? { ...item, status: 'returned' } : item));
        alert("Đã nhận trả sách thành công!");
        setIsHistoryDrawerOpen(false); // Đóng drawer nếu đang mở
        loadData(); // Load lại trạng thái sách
      } catch (error) {
        alert("Lỗi khi trả sách: " + error.message);
      }
    }
  };

  const confirmDelete = async () => {
    try {
      await libraryApi.deleteBook(bookToDelete.id);
      alert("Đã xóa sách thành công!");
      setBookToDelete(null);
      loadData();
    } catch (error) {
      alert("Lỗi khi xóa: " + error.message);
    }
  };

  const renderHomeTab = () => (
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
          <div className="search-box">
            <Search size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm sách..." />
          </div>
          <div className="book-list">
            {books.filter(b => b.title.toLowerCase().includes(search.toLowerCase())).map((book) => (
              <div className="book-card" key={book.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                {/* 1. Khu vực hiển thị ảnh bìa */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', marginTop: '8px' }}>
                  {book.cover ? (
                    <img 
                      src={book.cover} 
                      alt={book.title} 
                      style={{ 
                        width: '130px', 
                        height: '190px', 
                        objectFit: 'cover', 
                        borderRadius: '8px', 
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15), 0 4px 6px -4px rgba(0,0,0,0.1)' 
                      }} 
                    />
                  ) : (
                    /* Ảnh mặc định nếu sách chưa có link ảnh bìa */
                    <div style={{ 
                      width: '130px', height: '190px', background: '#f1f5f9', borderRadius: '8px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: '#94a3b8', border: '2px dashed #cbd5e1' 
                    }}>
                      <BookOpen size={40} />
                    </div>
                  )}
                </div>
                
                {/* 2. Khu vực thông tin (Căn giữa) */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span className={book.available ? 'badge available' : 'badge borrowed'}>
                      {book.available ? 'Có sẵn' : 'Đã mượn'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px 0', fontWeight: 800, color: '#0f172a', lineHeight: '1.4' }}>
                    {book.title}
                  </h3>
                  <p className="meta" style={{ margin: '0 0 16px 0', fontSize: '0.9rem' }}>
                    {book.author}
                  </p>
                </div>
                
                {/* 3. Khu vực nút bấm luôn nằm sát đáy */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button className="ghost-button" style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }} onClick={() => { setSelectedBook(book); setIsDetailOpen(true); }}>
                    Chi tiết
                  </button>
                  {book.available && (
                    <button className="primary-button" style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }} onClick={() => openBorrowModal(book)}>
                      Mượn
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );

  const renderBooksTab = () => (
    <div className="books-page">
      <div className="page-header">
        <div><h2>Quản lý kho sách</h2></div>
        <button className="primary-button" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Thêm sách mới</button>
      </div>

      <div className="panel no-pad">
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Mã</th><th>Tên sách</th><th>Tác giả</th><th>Thể loại</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
            <tbody>
              {books.map(b => (
                <tr key={b.id}>
                  <td>#{b.id}</td><td>{b.title}</td><td>{b.author}</td><td>{b.category}</td>
                  <td><span className={`badge ${b.available ? 'available' : 'borrowed'}`}>{b.available ? 'Có sẵn' : 'Đã mượn'}</span></td>
                  <td className="action-cell"><button className="icon-btn-small delete" onClick={() => setBookToDelete(b)} title="Xóa sách"><Trash2 size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- TRẢ LẠI MODAL THÊM SÁCH Ở ĐÂY --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Thêm sách mới</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <input name="title" placeholder="Tên sách" value={newBook.title} onChange={handleInputChange} required />
              <input name="author" placeholder="Tên tác giả" value={newBook.author} onChange={handleInputChange} required />
              <input name="category" placeholder="Thể loại" value={newBook.category} onChange={handleInputChange} />
              <input name="cover" placeholder="Link ảnh bìa (URL)" value={newBook.cover} onChange={handleInputChange} />
              <textarea name="description" placeholder="Mô tả sách..." value={newBook.description} onChange={handleInputChange} rows="3" />
              <div className="modal-actions" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button type="button" className="ghost-button" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button">Lưu sách</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- TRẢ LẠI MODAL XÓA SÁCH Ở ĐÂY --- */}
      {bookToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Xác nhận xóa</h2>
            <p>Bạn có chắc chắn muốn xóa sách <strong>"{bookToDelete.title}"</strong> không? Hành động này không thể hoàn tác.</p>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setBookToDelete(null)}>Hủy</button>
              <button className="primary-button" style={{background: '#ef4444'}} onClick={confirmDelete}>Xác nhận xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // --- RENDER TAB LỊCH SỬ ---
  const renderHistoryTab = () => {
    const today = new Date().toISOString().split('T')[0];
    const activeRecords = history.filter(h => h.status === 'active');
    const overdueRecords = activeRecords.filter(h => h.returnDate < today);

    return (
      <div className="books-page">
        <div className="page-header">
          <div><h2>Lịch sử mượn trả</h2></div>
        </div>

        {/* Khối thống kê của Lịch sử */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Tổng số đơn mượn</span>
            <strong style={{ display: 'block', fontSize: '2rem', color: '#0f172a', marginTop: '8px' }}>{history.length}</strong>
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Khách đang cầm sách</span>
            <strong style={{ display: 'block', fontSize: '2rem', color: '#3b82f6', marginTop: '8px' }}>{activeRecords.length}</strong>
          </div>
          <div style={{ background: '#fff1f2', padding: '24px', borderRadius: '16px', border: '1px solid #fecdd3' }}>
            <span style={{ color: '#e11d48', fontWeight: 700 }}>Báo động quá hạn</span>
            <strong style={{ display: 'block', fontSize: '2rem', color: '#be123c', marginTop: '8px' }}>{overdueRecords.length}</strong>
          </div>
        </div>

        {/* Bảng dữ liệu Lịch sử */}
        <div className="panel no-pad">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Đơn</th>
                  <th>Khách hàng</th>
                  <th>Sách mượn</th>
                  <th>Hạn trả</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {history.map(record => {
                  const isOverdue = record.status === 'active' && record.returnDate < today;
                  return (
                    <tr key={record.id}>
                      <td className="font-mono" style={{ color: '#64748b' }}>#{record.id}</td>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{record.customerName}</td>
                      <td>{record.bookTitle}</td>
                      <td style={{ color: isOverdue ? '#e11d48' : 'inherit', fontWeight: isOverdue ? '700' : '500' }}>
                        {record.returnDate}
                      </td>
                      <td>
                        {record.status === 'returned' ? (
                          <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Đã trả</span>
                        ) : isOverdue ? (
                          <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Quá hạn</span>
                        ) : (
                          <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>Đang mượn</span>
                        )}
                      </td>
                      <td className="action-cell">
                        <button className="icon-btn-small" onClick={() => { setSelectedHistory(record); setIsHistoryDrawerOpen(true); }}>Chi tiết</button>
                        {record.status === 'active' && (
                          <button className="primary-button" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleReturnBook(record)}>Nhận lại</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {history.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Chưa có lịch sử mượn trả nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="top-nav">
        <div className="nav-container">
          <div className="logo"><Library size={24} /> <span>CloudLibrary</span></div>
          <ul className="nav-links">
            <li><a href="#" className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>Home</a></li>
            <li><a href="#" className={activeTab === 'books' ? 'active' : ''} onClick={() => setActiveTab('books')}>Books</a></li>
            <li><a href="#" className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>History</a></li>
          </ul>
          <div className="user-input-nav">
             <span>U001</span>
             <div className="user-avatar"><User size={16} /></div>
          </div>
        </div>
      </header>
      
      <main className="app-shell">
        {activeTab === 'home' ? renderHomeTab() : activeTab === 'books' ? renderBooksTab() : renderHistoryTab()}
      </main>

      {/* DRAWER CHI TIẾT SÁCH (TRANG HOME) */}
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
                  <img src={selectedBook.cover} alt={selectedBook.title} style={{ width: '180px', height: '260px', objectFit: 'cover', borderRadius: '12px', boxShadow: '0 15px 25px -5px rgba(0,0,0,0.15)' }} />
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
                  <button className="primary-button" style={{ flex: 2 }} onClick={() => { setIsDetailOpen(false); openBorrowModal(selectedBook); }}>Mượn sách này</button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* DRAWER CHI TIẾT ĐƠN MƯỢN (TRANG HISTORY) */}
      {isHistoryDrawerOpen && selectedHistory && (
        <>
          <div className="drawer-overlay" onClick={() => setIsHistoryDrawerOpen(false)}></div>
          <div className="drawer-content">
            <div className="drawer-header">
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Mã đơn: <span className="font-mono" style={{ color: '#3b82f6' }}>#{selectedHistory.id}</span></h2>
              <button className="icon-btn-small" onClick={() => setIsHistoryDrawerOpen(false)}><X size={24} /></button>
            </div>
            
            <div className="drawer-body">
              {/* Thông tin Khách hàng */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#64748b', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Thông tin khách hàng</h4>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 8px 0' }}><strong>Tên:</strong> {selectedHistory.customerName}</p>
                  <p style={{ margin: '0 0 8px 0' }}><strong>SĐT:</strong> <span style={{ color: '#3b82f6', fontWeight: 600 }}>{selectedHistory.phone}</span></p>
                  <p style={{ margin: '0' }}><strong>CCCD:</strong> {selectedHistory.cccd}</p>
                </div>
              </div>

              {/* Thông tin Mượn */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#64748b', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Chi tiết mượn</h4>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 8px 0' }}><strong>Tên sách:</strong> {selectedHistory.bookTitle}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px', marginBottom: '8px' }}>
                    <span>Ngày mượn:</span> <strong>{selectedHistory.borrowDate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#e11d48' }}>Hạn trả:</span> <strong style={{ color: '#e11d48' }}>{selectedHistory.returnDate}</strong>
                  </div>
                </div>
              </div>

              {/* Tóm tắt tiền cọc để biết đường thối */}
              <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#065f46', fontWeight: 600 }}>Cần hoàn trả tiền cọc:</span>
                  <strong style={{ fontSize: '1.2rem', color: '#047857' }}>{selectedHistory.deposit.toLocaleString()} VNĐ</strong>
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="ghost-button" style={{ flex: 1 }} onClick={() => setIsHistoryDrawerOpen(false)}>Đóng</button>
                {selectedHistory.status === 'active' && (
                  <button className="primary-button" style={{ flex: 2 }} onClick={() => handleReturnBook(selectedHistory)}>Hoàn tất nhận trả</button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Mượn dùng chung */}
      {isBorrowModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            {borrowStep === 1 ? (
              <>
                <h2>Mượn sách: {borrowData.bookTitle}</h2>
                <form className="modal-form">
                  <input name="customerName" value={borrowData.customerName} onChange={handleBorrowInputChange} placeholder="Tên khách hàng" required />
                  <input name="phone" value={borrowData.phone} onChange={handleBorrowInputChange} placeholder="Số điện thoại" required />
                  <input name="cccd" value={borrowData.cccd} onChange={handleBorrowInputChange} placeholder="Số CCCD" required />
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Ngày mượn</label>
                      <input type="date" name="borrowDate" value={borrowData.borrowDate} onChange={handleBorrowInputChange} required />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Ngày trả</label>
                      <input type="date" name="returnDate" value={borrowData.returnDate} onChange={handleBorrowInputChange} required />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="ghost-button" onClick={() => setIsBorrowModalOpen(false)}>Hủy</button>
                    <button type="button" className="primary-button" onClick={() => setBorrowStep(2)}>Tiếp theo</button>
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
                <div className="modal-form">
                  <input placeholder="Nhập số tiền khách đưa" type="number" />
                  <input placeholder="Mã giảm giá (nếu có)" />
                </div>
                <div className="modal-actions">
                  <button className="ghost-button" onClick={() => setBorrowStep(1)}>Quay lại</button>
                  <button className="primary-button" onClick={handleConfirmBorrow}>Hoàn tất mượn</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

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

createRoot(document.getElementById('root')).render(<App />);

