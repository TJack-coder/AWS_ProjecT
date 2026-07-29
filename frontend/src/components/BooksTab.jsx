import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Filter,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { libraryApi, mediaUrl } from '../api';

const EMPTY_FORM = {
  title: '',
  author: '',
  category: '',
  cover: '',
  description: '',
  isbn: '',
  publisher: '',
  publicationYear: '',
  shelfLocation: '',
  totalQuantity: 3,
};

export default function BooksTab({ books, onRefresh }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bookToArchive, setBookToArchive] = useState(null);
  const [qrBook, setQrBook] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('id');
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const pageSize = 12;

  const categories = useMemo(
    () => [...new Set(books.map((book) => book.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')),
    [books],
  );

  const filteredBooks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const result = books.filter((book) => {
      const searchable = [book.title, book.author, book.category, book.isbn, book.shelfLocation, book.id]
        .filter((value) => value !== null && value !== undefined)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !keyword || searchable.includes(keyword);
      const matchesStatus = status === 'all'
        || (status === 'active' && book.isActive)
        || (status === 'available' && book.isActive && book.availableQuantity > 0)
        || (status === 'empty' && book.isActive && book.availableQuantity === 0)
        || (status === 'archived' && !book.isActive);
      const matchesCategory = category === 'all' || book.category === category;
      return matchesSearch && matchesStatus && matchesCategory;
    });
    return [...result].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'vi');
      if (sort === 'quantity') return b.totalQuantity - a.totalQuantity;
      if (sort === 'borrowed') return (b.borrowCount || 0) - (a.borrowCount || 0);
      return a.id - b.id;
    });
  }, [books, search, status, category, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / pageSize));
  const pageBooks = filteredBooks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => setCurrentPage(1), [search, status, category, sort]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openCreate = () => {
    setEditingBook(null);
    setForm(EMPTY_FORM);
    setCoverFile(null);
    setFormOpen(true);
  };

  const openEdit = (book) => {
    setEditingBook(book);
    setForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || '',
      cover: book.cover || '',
      description: book.description || '',
      isbn: book.isbn || '',
      publisher: book.publisher || '',
      publicationYear: book.publicationYear || '',
      shelfLocation: book.shelfLocation || '',
      totalQuantity: book.totalQuantity || 1,
    });
    setCoverFile(null);
    setFormOpen(true);
  };

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      let cover = form.cover;
      if (coverFile) cover = (await libraryApi.uploadImage(coverFile)).url;
      const payload = { ...form, cover, totalQuantity: Number(form.totalQuantity) };
      if (editingBook) await libraryApi.updateBook(editingBook.id, payload);
      else await libraryApi.createBook(payload);
      setFormOpen(false);
      setEditingBook(null);
      await onRefresh();
    } catch (error) {
      alert(`Không thể lưu sách: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const archiveBook = async () => {
    try {
      await libraryApi.deleteBook(bookToArchive.id);
      setBookToArchive(null);
      await onRefresh();
    } catch (error) {
      alert(`Không thể lưu trữ sách: ${error.message}`);
    }
  };

  const restoreBook = async (book) => {
    try {
      await libraryApi.restoreBook(book.id);
      await onRefresh();
    } catch (error) {
      alert(`Không thể khôi phục sách: ${error.message}`);
    }
  };

  const importBooks = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const result = await libraryApi.importBooks(file);
      const errorText = result.errors?.length ? ` Có ${result.errors.length} dòng cần kiểm tra.` : '';
      alert(`Đã nhập ${result.created} sách mới và cập nhật ${result.updated} sách.${errorText}`);
      await onRefresh();
    } catch (error) {
      alert(`Không thể nhập dữ liệu: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const totalCopies = books.filter((book) => book.isActive).reduce((sum, book) => sum + book.totalQuantity, 0);
  const availableCopies = books.filter((book) => book.isActive).reduce((sum, book) => sum + book.availableQuantity, 0);
  const archivedCount = books.filter((book) => !book.isActive).length;

  return (
    <div className="books-page">
      <div className="page-header">
        <div><p className="eyebrow dark">ADMIN WORKSPACE</p><h1>Quản lý kho sách</h1><p>CRUD đầy đủ, số lượng bản, ảnh tải từ máy, import/export và lưu trữ an toàn.</p></div>
        <div className="page-header-actions">
          <label className="secondary-button file-action"><Upload size={17}/>{importing ? 'Đang nhập...' : 'Nhập CSV/Excel'}<input type="file" accept=".csv,.xlsx" disabled={importing} onChange={importBooks}/></label>
          <div className="export-menu"><button className="ghost-button" onClick={()=>libraryApi.downloadBooks('xlsx')}><Download size={17}/>Xuất Excel</button><button className="icon-btn-small" title="Xuất CSV" onClick={()=>libraryApi.downloadBooks('csv')}>CSV</button><button className="icon-btn-small" title="Xuất PDF" onClick={()=>libraryApi.downloadBooks('pdf')}>PDF</button></div>
          <button className="primary-button" onClick={openCreate}><Plus size={18} />Thêm đầu sách</button>
        </div>
      </div>

      <section className="mini-stat-grid">
        <div><span>Đầu sách đang hoạt động</span><strong>{books.filter((book) => book.isActive).length}</strong></div>
        <div><span>Tổng số bản</span><strong>{totalCopies}</strong></div>
        <div><span>Bản đang có sẵn</span><strong>{availableCopies}</strong></div>
        <div><span>Đã lưu trữ</span><strong>{archivedCount}</strong></div>
      </section>

      <section className="panel no-pad">
        <div className="management-toolbar">
          <div className="search-box toolbar-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, tác giả, ISBN, kệ hoặc mã sách..." /></div>
          <label className="select-control"><Filter size={16} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Đang hoạt động</option><option value="available">Còn bản</option><option value="empty">Tạm hết</option><option value="archived">Đã lưu trữ</option><option value="all">Tất cả</option></select></label>
          <label className="select-control"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Mọi thể loại</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="select-control"><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="id">Mã sách</option><option value="title">Tên A–Z</option><option value="quantity">Nhiều bản nhất</option><option value="borrowed">Mượn nhiều nhất</option></select></label>
        </div>

        <div className="table-container">
          <table className="data-table management-table">
            <thead><tr><th>Mã</th><th>Sách</th><th>ISBN / Kệ</th><th>Số lượng</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
            <tbody>
              {pageBooks.map((book) => (
                <tr key={book.id} className={!book.isActive ? 'archived-row' : ''}>
                  <td className="font-mono">#{String(book.id).padStart(3, '0')}</td>
                  <td><div className="table-book"><div className="table-cover">{book.cover ? <img src={mediaUrl(book.cover)} alt="" /> : '📘'}</div><div><strong>{book.title}</strong><small>{book.author} · {book.category}</small></div></div></td>
                  <td><div className="stacked-cell"><span>{book.isbn || 'Chưa có ISBN'}</span><small>{book.shelfLocation || 'Chưa xếp kệ'}</small></div></td>
                  <td><div className="quantity-cell"><strong>{book.availableQuantity}/{book.totalQuantity}</strong><div className="quantity-track"><span style={{ width: `${book.totalQuantity ? (book.availableQuantity / book.totalQuantity) * 100 : 0}%` }} /></div><small>{book.borrowedQuantity} bản đang mượn</small></div></td>
                  <td><span className={`badge ${!book.isActive ? 'archived' : book.availableQuantity > 0 ? 'available' : 'borrowed'}`}>{!book.isActive ? 'Lưu trữ' : book.availableQuantity > 0 ? 'Hoạt động' : 'Tạm hết'}</span></td>
                  <td><div className="action-cell">
                    <button className="icon-btn-small" title="Mã QR" onClick={() => setQrBook(book)}><QrCode size={17} /></button>
                    <button className="icon-btn-small" title="Chỉnh sửa" onClick={() => openEdit(book)}><Edit3 size={17} /></button>
                    {book.isActive
                      ? <button className="icon-btn-small delete" title="Lưu trữ" onClick={() => setBookToArchive(book)}><Archive size={17} /></button>
                      : <button className="icon-btn-small restore" title="Khôi phục" onClick={() => restoreBook(book)}><RotateCcw size={17} /></button>}
                  </div></td>
                </tr>
              ))}
              {pageBooks.length === 0 && <tr><td colSpan="6"><div className="empty-state compact"><Search size={30} /><p>Không có đầu sách phù hợp.</p></div></td></tr>}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && <div className="pagination"><button disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}><ChevronLeft size={18} />Trước</button><span>Trang <strong>{currentPage}</strong> / {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Sau<ChevronRight size={18} /></button></div>}
      </section>

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal-content modal-large" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setFormOpen(false)}><X size={21} /></button>
            <div className="modal-heading"><p className="eyebrow dark">{editingBook ? 'UPDATE BOOK' : 'CREATE BOOK'}</p><h2>{editingBook ? 'Chỉnh sửa đầu sách' : 'Thêm đầu sách mới'}</h2><p>Cập nhật thông tin nghiệp vụ và số lượng bản trong kho.</p></div>
            <form onSubmit={submit} className="modal-form book-form">
              <div className="form-row"><label>Tên sách *<input name="title" value={form.title} onChange={change} required /></label><label>Tác giả *<input name="author" value={form.author} onChange={change} required /></label></div>
              <div className="form-row"><label>Thể loại<input name="category" value={form.category} onChange={change} placeholder="Programming" /></label><label>ISBN<input name="isbn" value={form.isbn} onChange={change} placeholder="978..." /></label></div>
              <div className="form-row"><label>Nhà xuất bản<input name="publisher" value={form.publisher} onChange={change} /></label><label>Năm xuất bản<input type="number" name="publicationYear" value={form.publicationYear} onChange={change} min="1900" max="2100" /></label></div>
              <div className="form-row"><label>Vị trí kệ<input name="shelfLocation" value={form.shelfLocation} onChange={change} placeholder="A-01" /></label><label>Tổng số bản *<input type="number" name="totalQuantity" value={form.totalQuantity} onChange={change} min="1" required /></label></div>
              <label>Ảnh bìa từ máy<div className="cover-upload-field"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setCoverFile(event.target.files?.[0] || null)} />{(coverFile || form.cover) && <div className="cover-preview"><img src={coverFile ? URL.createObjectURL(coverFile) : mediaUrl(form.cover)} alt="Xem trước bìa sách" /><span>{coverFile ? coverFile.name : 'Ảnh hiện tại'}</span></div>}</div></label>
              <label>Mô tả<textarea name="description" value={form.description} onChange={change} rows="4" /></label>
              {editingBook && <p className="form-hint">Đang có {editingBook.borrowedQuantity} bản được mượn. Tổng số bản không thể thấp hơn con số này.</p>}
              <div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setFormOpen(false)}>Hủy</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
            </form>
          </div>
        </div>
      )}

      {bookToArchive && (
        <div className="modal-overlay" onClick={() => setBookToArchive(null)}>
          <div className="modal-content confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="danger-icon"><Archive size={25} /></div><h2>Lưu trữ đầu sách?</h2><p><strong>{bookToArchive.title}</strong> sẽ không còn xuất hiện trong kho cho độc giả, nhưng toàn bộ lịch sử mượn vẫn được giữ lại.</p>
            <div className="modal-actions"><button className="ghost-button" onClick={() => setBookToArchive(null)}>Hủy</button><button className="danger-button" onClick={archiveBook}>Xác nhận lưu trữ</button></div>
          </div>
        </div>
      )}

      {qrBook && (
        <div className="modal-overlay" onClick={() => setQrBook(null)}><div className="modal-content qr-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setQrBook(null)}><X size={21} /></button><div className="qr-icon"><QrCode size={28} /></div><h2>Mã QR sách</h2><p>{qrBook.title}</p><img src={libraryApi.bookQrUrl(qrBook.id)} alt={`QR ${qrBook.title}`} className="qr-image" /><div className="qr-code-caption"><span>Mã sách</span><strong>BOOK-{String(qrBook.id).padStart(4, '0')}</strong></div></div></div>
      )}
    </div>
  );
}
