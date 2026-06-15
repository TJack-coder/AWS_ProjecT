import React from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, CheckCircle2, Clock, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { libraryApi } from './api';
import './styles.css';

const emptyForm = {
  title: '',
  author: '',
  category: '',
  description: '',
};

function App() {
  const [books, setBooks] = React.useState([]);
  const [selectedBook, setSelectedBook] = React.useState(null);
  const [records, setRecords] = React.useState([]);
  const [form, setForm] = React.useState(emptyForm);
  const [editingId, setEditingId] = React.useState(null);
  const [userId, setUserId] = React.useState('U001');
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState(null);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookData, recordData] = await Promise.all([
        libraryApi.getBooks(),
        libraryApi.getBorrowRecords(),
      ]);
      setBooks(bookData);
      setRecords(recordData);
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredBooks = books.filter((book) => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) return true;
    return [book.title, book.author, book.category]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(keyword));
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.author.trim()) {
      showMessage('error', 'Vui lòng nhập tên sách và tác giả.');
      return;
    }

    try {
      if (editingId) {
        await libraryApi.updateBook(editingId, form);
        showMessage('success', 'Cập nhật sách thành công.');
      } else {
        await libraryApi.createBook(form);
        showMessage('success', 'Thêm sách thành công.');
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const editBook = (book) => {
    setEditingId(book.id);
    setForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || '',
      description: book.description || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBook = async (book) => {
    const confirmed = window.confirm(`Xóa sách "${book.title}"?`);
    if (!confirmed) return;

    try {
      await libraryApi.deleteBook(book.id);
      showMessage('success', 'Xóa sách thành công.');
      if (selectedBook?.id === book.id) setSelectedBook(null);
      await loadData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const borrowBook = async (book) => {
    if (!userId.trim()) {
      showMessage('error', 'Vui lòng nhập User ID trước khi mượn sách.');
      return;
    }
    try {
      await libraryApi.borrowBook(book.id, userId.trim());
      showMessage('success', `Mượn sách "${book.title}" thành công.`);
      await loadData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const returnBook = async (book) => {
    if (!userId.trim()) {
      showMessage('error', 'Vui lòng nhập User ID trước khi trả sách.');
      return;
    }
    try {
      await libraryApi.returnBook(book.id, userId.trim());
      showMessage('success', `Trả sách "${book.title}" thành công.`);
      await loadData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const viewDetail = async (bookId) => {
    try {
      const book = await libraryApi.getBook(bookId);
      setSelectedBook(book);
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const borrowedCount = books.filter((book) => !book.available).length;
  const availableCount = books.filter((book) => book.available).length;

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Sprint 0 - Core App</p>
          <h1>Library Borrowing System</h1>
          <p className="subtitle">
            Ứng dụng mượn/trả sách cơ bản dùng React, Flask API và PostgreSQL.
          </p>
        </div>
        <button className="secondary-button" onClick={loadData} disabled={loading}>
          <RefreshCcw size={18} />
          {loading ? 'Đang tải...' : 'Refresh'}
        </button>
      </section>

      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

      <section className="stats-grid">
        <StatCard title="Tổng sách" value={books.length} icon={<BookOpen />} />
        <StatCard title="Còn sẵn" value={availableCount} icon={<CheckCircle2 />} />
        <StatCard title="Đang mượn" value={borrowedCount} icon={<Clock />} />
      </section>

      <section className="panel form-panel">
        <div className="section-header">
          <div>
            <h2>{editingId ? 'Cập nhật sách' : 'Thêm sách mới'}</h2>
            <p>CRUD sách trong thư viện.</p>
          </div>
        </div>

        <form className="book-form" onSubmit={handleSubmit}>
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Tên sách"
          />
          <input
            value={form.author}
            onChange={(event) => setForm({ ...form, author: event.target.value })}
            placeholder="Tác giả"
          />
          <input
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
            placeholder="Thể loại"
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Mô tả sách"
          />
          <div className="form-actions">
            <button className="primary-button" type="submit">
              <Plus size={18} />
              {editingId ? 'Lưu cập nhật' : 'Thêm sách'}
            </button>
            {editingId && (
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Hủy
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Danh sách sách</h2>
              <p>GET /books, GET /books/:id, POST /borrow, POST /return</p>
            </div>
            <div className="user-field">
              <label>User ID</label>
              <input value={userId} onChange={(event) => setUserId(event.target.value)} />
            </div>
          </div>

          <div className="search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên sách, tác giả hoặc thể loại..."
            />
          </div>

          <div className="book-list">
            {filteredBooks.map((book) => (
              <article className="book-card" key={book.id}>
                <div>
                  <div className="book-title-row">
                    <h3>{book.title}</h3>
                    <span className={book.available ? 'badge available' : 'badge borrowed'}>
                      {book.available ? 'Available' : 'Borrowed'}
                    </span>
                  </div>
                  <p className="meta">{book.author} · {book.category}</p>
                  <p className="description">{book.description || 'Chưa có mô tả.'}</p>
                </div>
                <div className="card-actions">
                  <button className="secondary-button" onClick={() => viewDetail(book.id)}>Detail</button>
                  <button className="secondary-button" onClick={() => editBook(book)}>Edit</button>
                  {book.available ? (
                    <button className="primary-button" onClick={() => borrowBook(book)}>Borrow</button>
                  ) : (
                    <button className="primary-button" onClick={() => returnBook(book)}>Return</button>
                  )}
                  <button className="danger-button" onClick={() => deleteBook(book)} aria-label="Delete book">
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
            {filteredBooks.length === 0 && <p className="empty-state">Không tìm thấy sách phù hợp.</p>}
          </div>
        </div>

        <aside className="panel side-panel">
          <h2>Chi tiết sách</h2>
          {selectedBook ? (
            <div className="detail-box">
              <h3>{selectedBook.title}</h3>
              <p><strong>Tác giả:</strong> {selectedBook.author}</p>
              <p><strong>Thể loại:</strong> {selectedBook.category}</p>
              <p><strong>Trạng thái:</strong> {selectedBook.available ? 'Còn sẵn' : 'Đang được mượn'}</p>
              <p><strong>Mô tả:</strong> {selectedBook.description || 'Chưa có mô tả.'}</p>
              <h4>Lịch sử mượn/trả</h4>
              {selectedBook.borrow_records?.length ? (
                <ul className="record-list">
                  {selectedBook.borrow_records.map((record) => (
                    <li key={record.id}>
                      User {record.user_id}: {record.status}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">Chưa có lịch sử.</p>
              )}
            </div>
          ) : (
            <p className="empty-state">Chọn Detail để xem thông tin sách.</p>
          )}

          <h2 className="mt">Giao dịch gần đây</h2>
          <ul className="record-list">
            {records.slice(0, 8).map((record) => (
              <li key={record.id}>
                Book #{record.book_id} · User {record.user_id} · {record.status}
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
