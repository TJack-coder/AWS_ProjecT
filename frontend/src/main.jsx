import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  BookOpen, CheckCircle2, Clock, Plus, Search, 
  X, Home, Library, History, User 
} from 'lucide-react';
import { libraryApi } from './api';
import './styles.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State lưu dữ liệu form
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

  // --- TRANG CHỦ ---
  const renderHomeTab = () => (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">DASHBOARD</p>
          <h1>Library Borrowing System</h1>
          <p className="subtitle">Hệ thống quản lý kho sách tập trung, giúp theo dõi vận hành thư viện hiệu quả.</p>
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
              <article className="book-card" key={book.id}>
                <div>
                  <div className="book-title-row">
                    <h3>{book.title}</h3>
                    <span className={book.available ? 'badge available' : 'badge borrowed'}>
                      {book.available ? 'Available' : 'Borrowed'}
                    </span>
                  </div>
                  <p className="meta">{book.author} · {book.category}</p>
                </div>
                <div className="card-actions">
                  <button className="secondary-button" onClick={() => setSelectedBook(book)}>Detail</button>
                </div>
              </article>
            ))}
          </div>
        </div>
        <aside className="panel side-panel">
          <h2>Chi tiết sách</h2>
          {selectedBook ? (
            <div className="detail-box">
              <h3>{selectedBook.title}</h3>
              <p><strong>Tác giả:</strong> {selectedBook.author}</p>
            </div>
          ) : (<p className="empty-state">Chọn Detail để xem thông tin sách.</p>)}
        </aside>
      </section>
    </>
  );

  // --- TRANG BOOKS ---
  const renderBooksTab = () => (
    <div className="books-page">
      <div className="page-header">
        <div><h2>Quản lý kho sách</h2><p className="text-muted">Xem, thêm, sửa, xóa và quản lý trạng thái sách</p></div>
        <button className="primary-button" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Thêm sách mới</button>
      </div>

      <div className="mini-stats-row">
        <div className="mini-stat"><span className="dot blue"></span> Tổng: <strong>{books.length}</strong></div>
        <div className="mini-stat"><span className="dot green"></span> Có sẵn: <strong>{books.filter(b => b.available).length}</strong></div>
        <div className="mini-stat"><span className="dot red"></span> Đang mượn: <strong>{books.filter(b => !b.available).length}</strong></div>
      </div>

      <div className="panel no-pad">
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Mã</th><th>Tên sách</th><th>Tác giả</th><th>Thể loại</th></tr></thead>
            <tbody>
              {books.map(b => (
                <tr key={b.id}><td>#{b.id}</td><td>{b.title}</td><td>{b.author}</td><td>{b.category}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Thêm sách mới</h2>
              <button className="icon-button" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <input name="title" value={newBook.title} onChange={handleInputChange} placeholder="Tên sách" required />
              <input name="author" value={newBook.author} onChange={handleInputChange} placeholder="Tên tác giả" required />
              <input name="category" value={newBook.category} onChange={handleInputChange} placeholder="Thể loại" />
              <input name="cover" value={newBook.cover} onChange={handleInputChange} placeholder="Link ảnh bìa sách (URL)" />
              <textarea name="description" value={newBook.description} onChange={handleInputChange} placeholder="Mô tả sách..." />
              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button">Xác nhận thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // --- TRANG HISTORY ---
  const renderHistoryTab = () => (
    <div className="books-page">
      <h2>Lịch sử mượn trả</h2>
      <div className="panel no-pad">
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Mã giao dịch</th><th>Mã sách</th><th>Người mượn</th><th>Trạng thái</th></tr></thead>
            <tbody>
              <tr><td colSpan="4" className="empty-table"><div style={{padding:'40px'}}>Chưa có dữ liệu lịch sử.</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header className="top-nav">
        <div className="nav-container">
          <div className="logo"><Library size={24} /> <span>CloudLibrary</span></div>
          <ul className="nav-links">
            <li><a href="#" className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}><Home size={18} /> Home</a></li>
            <li><a href="#" className={activeTab === 'books' ? 'active' : ''} onClick={() => setActiveTab('books')}><BookOpen size={18} /> Books</a></li>
            <li><a href="#" className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}><History size={18} /> History</a></li>
          </ul>
          <div className="user-input-nav"><span>U001</span><div className="user-avatar"><User size={16} /></div></div>
        </div>
      </header>
      <main className="app-shell">{activeTab === 'home' ? renderHomeTab() : activeTab === 'books' ? renderBooksTab() : renderHistoryTab()}</main>
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