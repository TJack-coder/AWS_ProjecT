import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  QrCode,
  ScanLine,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { libraryApi, mediaUrl } from '../api';

const PAGE_SIZE = 12;

function BookCover({ book, large = false }) {
  const className = large ? 'book-cover large' : 'book-cover';
  return book.cover
    ? <img className={className} src={mediaUrl(book.cover)} alt={`Bìa sách ${book.title}`} />
    : <div className={`${className} cover-placeholder`}><BookOpen size={large ? 48 : 34} /></div>;
}

function QuantityBadge({ book }) {
  if (!book.isActive) return <span className="badge archived">Đã lưu trữ</span>;
  if (book.availableQuantity <= 0) return <span className="badge borrowed">Hết sách</span>;
  return <span className="badge available">Còn {book.availableQuantity}/{book.totalQuantity}</span>;
}

export default function HomeTab({ books, recommendations, user, onBorrow, onReserve, initialBookId }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [sort, setSort] = useState('popular');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [qrBook, setQrBook] = useState(null);

  const categories = useMemo(
    () => [...new Set(books.map((book) => book.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')),
    [books],
  );

  const filteredBooks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const result = books.filter((book) => {
      const searchable = [book.title, book.author, book.category, book.isbn, book.shelfLocation]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !keyword || searchable.includes(keyword);
      const matchesCategory = category === 'all' || book.category === category;
      const matchesAvailability = availability === 'all'
        || (availability === 'available' && book.availableQuantity > 0)
        || (availability === 'unavailable' && book.availableQuantity <= 0);
      return matchesSearch && matchesCategory && matchesAvailability;
    });

    return [...result].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'vi');
      if (sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sort === 'quantity') return b.availableQuantity - a.availableQuantity;
      return (b.borrowCount || 0) - (a.borrowCount || 0) || a.title.localeCompare(b.title, 'vi');
    });
  }, [books, search, category, availability, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const pageBooks = filteredBooks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => setCurrentPage(1), [search, category, availability, sort]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openDetail = async (book) => {
    setSelectedBook(book);
    setDetailLoading(true);
    try {
      setSelectedBook(await libraryApi.getBook(book.id));
    } catch {
      setSelectedBook(book);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!initialBookId || !books.length) return;
    const book = books.find((item) => item.id === initialBookId);
    if (book) openDetail(book);
  }, [initialBookId, books.length]);

  const scanQrImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!('BarcodeDetector' in window)) {
      alert('Trình duyệt này chưa hỗ trợ đọc QR từ ảnh. Hãy dùng Chrome phiên bản mới hoặc quét bằng camera điện thoại.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const [result] = await detector.detect(bitmap);
      bitmap.close?.();
      if (!result?.rawValue) throw new Error('Không tìm thấy mã QR trong ảnh');
      const raw = result.rawValue.trim();
      let bookId = null;
      try { bookId = Number(new URL(raw, window.location.origin).searchParams.get('book')); } catch { /* use code fallback */ }
      if (!bookId) {
        const match = raw.match(/BOOK[-_ ]?(\d+)/i) || raw.match(/book[=/](\d+)/i);
        bookId = match ? Number(match[1]) : null;
      }
      const book = books.find((item) => item.id === bookId);
      if (!book) throw new Error('Mã QR không thuộc kho sách hiện tại');
      await openDetail(book);
    } catch (error) {
      alert(error.message || 'Không thể đọc mã QR');
    }
  };

  const renderBookCard = (book, reason) => (
    <article className="book-card" key={book.id}>
      <div className="book-card-cover-wrap">
        <BookCover book={book} />
        <button className="floating-qr" title="Xem mã QR" onClick={() => setQrBook(book)}><QrCode size={18} /></button>
      </div>
      <div className="book-card-body">
        <div className="book-card-topline"><QuantityBadge book={book} /><span className="category-chip">{book.category}</span></div>
        <h3>{book.title}</h3>
        <p className="book-author">{book.author}</p>
        {reason && <p className="recommendation-reason"><Sparkles size={14} />{reason}</p>}
        <div className="inventory-line"><span>{book.borrowCount || 0} lượt mượn</span><span>{book.shelfLocation || 'Chưa xếp kệ'}</span></div>
      </div>
      <div className="book-card-actions">
        <button className="ghost-button" onClick={() => openDetail(book)}>Chi tiết</button>
        {book.availableQuantity > 0
          ? <button className="primary-button" onClick={() => onBorrow(book)}>Mượn sách</button>
          : <button className="secondary-button" onClick={() => onReserve(book)}>Đặt trước</button>}
      </div>
    </article>
  );

  return (
    <div className="catalog-page">
      <section className="catalog-header">
        <div><p className="eyebrow dark">60 ĐẦU SÁCH DEMO</p><h1>Khám phá kho sách</h1><p>Tìm sách theo tên, tác giả, ISBN, thể loại hoặc vị trí kệ.</p></div>
        <div className="catalog-header-tools"><label className="secondary-button file-action"><ScanLine size={18}/>Đọc QR từ ảnh<input type="file" accept="image/*" onChange={scanQrImage}/></label><div className="catalog-summary"><strong>{books.reduce((sum, book) => sum + book.availableQuantity, 0)}</strong><span>bản đang sẵn sàng</span></div></div>
      </section>

      {recommendations?.length > 0 && (
        <section className="recommendation-section">
          <div className="section-heading">
            <div><p className="eyebrow dark">GỢI Ý CHO BẠN</p><h2>Sách nên đọc tiếp theo</h2></div>
            <span className="personalized-label"><Sparkles size={15} />Đề xuất đơn giản theo lịch sử mượn</span>
          </div>
          <div className="recommendation-scroller">
            {recommendations.slice(0, 6).map((book) => renderBookCard(book, book.recommendationReason))}
          </div>
        </section>
      )}

      <section className="panel catalog-panel">
        <div className="catalog-toolbar">
          <div className="search-box toolbar-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên sách, tác giả, ISBN, mã kệ..." /></div>
          <label className="select-control"><Filter size={16} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Mọi thể loại</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="select-control"><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">Mọi trạng thái</option><option value="available">Còn sách</option><option value="unavailable">Tạm hết</option></select></label>
          <label className="select-control"><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="popular">Phổ biến nhất</option><option value="title">Tên A–Z</option><option value="newest">Mới nhập</option><option value="quantity">Còn nhiều bản</option></select></label>
        </div>

        <div className="result-meta"><span>Tìm thấy <strong>{filteredBooks.length}</strong> đầu sách</span>{search && <button className="text-button" onClick={() => setSearch('')}>Xóa từ khóa</button>}</div>
        <div className="book-list">{pageBooks.map((book) => renderBookCard(book))}</div>
        {pageBooks.length === 0 && <div className="empty-state"><Search size={38} /><h3>Không tìm thấy sách phù hợp</h3><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}><ChevronLeft size={18} />Trang trước</button>
            <span>Trang <strong>{currentPage}</strong> / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Trang sau<ChevronRight size={18} /></button>
          </div>
        )}
      </section>

      {selectedBook && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedBook(null)} />
          <aside className="drawer-content wide-drawer">
            <div className="drawer-header"><div><p className="eyebrow dark">THÔNG TIN SÁCH</p><h2>Chi tiết đầu sách</h2></div><button className="icon-btn-small" onClick={() => setSelectedBook(null)}><X size={23} /></button></div>
            <div className="drawer-body">
              {detailLoading && <div className="loading-inline">Đang tải chi tiết...</div>}
              <div className="detail-book-top"><BookCover book={selectedBook} large /><div><QuantityBadge book={selectedBook} /><h3>{selectedBook.title}</h3><p>{selectedBook.author}</p><span className="category-chip">{selectedBook.category}</span></div></div>
              <div className="detail-grid">
                <div><span>ISBN</span><strong>{selectedBook.isbn || 'Chưa cập nhật'}</strong></div>
                <div><span>Vị trí kệ</span><strong><MapPin size={15} />{selectedBook.shelfLocation || 'Chưa xếp kệ'}</strong></div>
                <div><span>Tổng số bản</span><strong>{selectedBook.totalQuantity}</strong></div>
                <div><span>Đang có sẵn</span><strong>{selectedBook.availableQuantity}</strong></div>
                <div><span>Nhà xuất bản</span><strong>{selectedBook.publisher || 'Chưa cập nhật'}</strong></div>
                <div><span>Năm xuất bản</span><strong>{selectedBook.publicationYear || 'Chưa cập nhật'}</strong></div>
              </div>
              <div className="detail-description"><h4>Mô tả</h4><p>{selectedBook.description || 'Chưa có mô tả cho đầu sách này.'}</p></div>
              {selectedBook.myBorrowRecords?.length > 0 && <div className="mini-history"><h4>Lịch sử của bạn với sách này</h4>{selectedBook.myBorrowRecords.slice(0, 3).map((record) => <div key={record.id}><span>Phiếu #{record.id}</span><span className={`badge ${record.status === 'active' ? 'borrowed' : 'available'}`}>{record.status === 'active' ? 'Đang mượn' : 'Đã trả'}</span></div>)}</div>}
            </div>
            <div className="drawer-footer"><button className="ghost-button" onClick={() => setQrBook(selectedBook)}><QrCode size={17} />Mã QR</button>{selectedBook.availableQuantity > 0 ? <button className="primary-button" onClick={() => { onBorrow(selectedBook); setSelectedBook(null); }}>Mượn sách</button> : <button className="secondary-button" onClick={() => { onReserve(selectedBook); setSelectedBook(null); }}>Đặt trước</button>}</div>
          </aside>
        </>
      )}

      {qrBook && (
        <div className="modal-overlay" onClick={() => setQrBook(null)}>
          <div className="modal-content qr-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setQrBook(null)}><X size={21} /></button>
            <div className="qr-icon"><QrCode size={28} /></div>
            <h2>Mã QR sách</h2><p>Quét mã để mở nhanh thông tin <strong>{qrBook.title}</strong>.</p>
            <img src={libraryApi.bookQrUrl(qrBook.id)} alt={`QR ${qrBook.title}`} className="qr-image" />
            <div className="qr-code-caption"><span>Mã sách</span><strong>BOOK-{String(qrBook.id).padStart(4, '0')}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
