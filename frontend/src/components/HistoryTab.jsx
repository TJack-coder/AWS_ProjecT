import React, { useState, useEffect } from 'react';
import { Search, Calendar, Filter, X } from 'lucide-react';
import { libraryApi } from '../api';

export default function HistoryTab({ history, user, onRefresh }) {
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;

  // Logic lọc và sắp xếp
  const filteredHistory = history.filter(record => {
    const borrowDate = (record.borrow_date || record.borrowDate)?.split('T')[0];
    const matchesSearch = record.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          record.id.toString().includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    const matchesDate = (!startDate || borrowDate >= startDate) && (!endDate || borrowDate <= endDate);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => 
    new Date(b.borrow_date || b.borrowDate) - new Date(a.borrow_date || a.borrowDate)
  );

  const totalPages = Math.ceil(sortedHistory.length / recordsPerPage);
  const currentRecords = sortedHistory.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  const groupedHistory = currentRecords.reduce((groups, record) => {
    const date = (record.borrow_date || record.borrowDate)?.split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(record);
    return groups;
  }, {});

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, startDate, endDate]);

  const handleReturnBook = async (record) => {
    if (window.confirm(`Xác nhận khách [${record.customerName}] đã trả sách?`)) {
      try {
        await libraryApi.returnBook({ book_id: record.book_id || record.bookId });
        onRefresh(); 
        setIsDrawerOpen(false);
      } catch (error) { alert("Lỗi: " + error.message); }
    }
  };

  return (
    <div className="books-page">
      <div className="page-header"><h2>Quản lý Lịch sử Mượn/Trả</h2></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div className="stat-bubble" style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>Tổng đơn hệ thống</span>
          <strong style={{ display: 'block', fontSize: '2rem', color: '#0f172a', marginTop: '8px' }}>{history.length}</strong>
        </div>
        <div className="stat-bubble" style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>Đang mượn</span>
          <strong style={{ display: 'block', fontSize: '2rem', color: '#3b82f6', marginTop: '8px' }}>{history.filter(h=>h.status==='active').length}</strong>
        </div>
        <div className="stat-bubble" style={{ background: '#fff1f2', padding: '24px', borderRadius: '16px', border: '1px solid #fecdd3' }}>
          <span style={{ color: '#e11d48', fontWeight: 700 }}>Quá hạn</span>
          <strong style={{ display: 'block', fontSize: '2rem', color: '#be123c', marginTop: '8px' }}>{history.filter(h => h.status==='active' && (h.expectedReturnDate || h.returnDate) < new Date().toISOString().split('T')[0]).length}</strong>
        </div>
      </div>

      <div className="panel no-pad">
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, margin: 0, minWidth: '200px' }}><Search size={18} /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm tên khách/mã đơn..." /></div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <option value="all">Tất cả</option><option value="active">Đang mượn</option><option value="returned">Đã trả</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <span>đến</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <button className="ghost-button" onClick={() => { setStartDate(''); setEndDate(''); }}>Reset</button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Mã Đơn</th><th>Khách hàng</th><th>Sách</th><th>Hạn trả</th><th>Trạng thái</th><th>Hành động</th></tr>
            </thead>
            {Object.keys(groupedHistory).map(date => (
              <React.Fragment key={date}>
                <tr style={{ background: '#f1f5f9' }}>
                  <td colSpan="6" style={{ fontWeight: 800, color: '#334155', padding: '12px 24px' }}><Calendar size={16} style={{display:'inline', marginRight:'8px'}}/> Giao dịch ngày {date}</td>
                </tr>
                {groupedHistory[date].map(record => (
                  <tr key={record.id}>
                    <td className="font-mono">#{record.id}</td>
                    <td style={{ fontWeight: 600 }}>{record.customerName}</td>
                    <td>{record.bookTitle}</td>
                    <td>{record.expectedReturnDate || record.returnDate}</td>
                    <td><span className={`badge ${record.status === 'active' ? 'borrowed' : 'available'}`}>{record.status === 'active' ? 'Đang mượn' : 'Đã trả'}</span></td>
                    <td><button className="icon-btn-small" onClick={() => { setSelectedHistory(record); setIsDrawerOpen(true); }}>Chi tiết</button></td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </table>
        </div>
        
        {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', borderTop: '1px solid #e2e8f0' }}>
                <button className="ghost-button" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>Trước</button>
                <span style={{ padding: '10px 20px', fontWeight: 600 }}>{currentPage} / {totalPages}</span>
                <button className="primary-button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)}>Sau</button>
            </div>
        )}
      </div>

      {isDrawerOpen && selectedHistory && (
        <>
          <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="drawer-content">
            <div className="drawer-header">
              <h2>Mã đơn: #{selectedHistory.id}</h2>
              <button className="icon-btn-small" onClick={() => setIsDrawerOpen(false)}><X size={24} /></button>
            </div>
            <div className="drawer-body">
              <p><strong>Khách hàng:</strong> {selectedHistory.customerName}</p>
              <p><strong>Sách:</strong> {selectedHistory.bookTitle}</p>
              <p><strong>Ngày mượn:</strong> {(selectedHistory.borrow_date || selectedHistory.borrowDate)?.split('T')[0]}</p>
              <p><strong>Hạn trả:</strong> {selectedHistory.expectedReturnDate || selectedHistory.returnDate}</p>
            </div>
            <div className="drawer-footer">
               {selectedHistory.status === 'active' && <button className="primary-button" onClick={() => handleReturnBook(selectedHistory)}>Nhận trả</button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}