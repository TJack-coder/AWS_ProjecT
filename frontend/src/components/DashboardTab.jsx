import React from 'react';
import {
  AlertTriangle,
  BookCheck,
  BookCopy,
  BookOpen,
  Clock3,
  LibraryBig,
  Users,
} from 'lucide-react';
import { mediaUrl } from '../api';

function MetricCard({ label, value, detail, icon: Icon, tone = 'slate' }) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <div className="metric-icon"><Icon size={24} /></div>
      <div><p>{label}</p><strong>{value ?? 0}</strong><small>{detail}</small></div>
    </div>
  );
}

export default function DashboardTab({ dashboard, alerts, user, onNavigate }) {
  if (!dashboard) return <div className="panel empty-state">Đang tải dữ liệu dashboard...</div>;
  const maxCategory = Math.max(...(dashboard.categories || []).map((item) => item.count), 1);
  const maxTrend = Math.max(...(dashboard.borrowTrend || []).map((item) => item.count), 1);

  return (
    <div className="dashboard-page">
      <section className="hero dashboard-hero">
        <div>
          <p className="eyebrow">AWS LIBRARY SYSTEM</p>
          <h1>Xin chào, {user.fullName || user.username}</h1>
          <p className="subtitle">
            {user.role === 'admin'
              ? 'Theo dõi kho sách, lượt mượn và các cảnh báo vận hành trong một màn hình.'
              : 'Khám phá sách mới, theo dõi sách đang mượn và gia hạn đúng hạn.'}
          </p>
          <div className="hero-actions">
            <button className="light-button" onClick={() => onNavigate('catalog')}>Khám phá kho sách</button>
            <button className="outline-light-button" onClick={() => onNavigate('history')}>
              {user.role === 'admin' ? 'Quản lý mượn trả' : 'Xem sách của tôi'}
            </button>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard label="Đầu sách" value={dashboard.totalTitles} detail={`${dashboard.totalCopies} bản sách`} icon={LibraryBig} />
        <MetricCard label="Bản có sẵn" value={dashboard.availableCopies} detail="có thể mượn ngay" icon={BookCheck} tone="green" />
        <MetricCard label="Đang được mượn" value={dashboard.borrowedCopies} detail={`${dashboard.activeLoans} phiếu đang hoạt động`} icon={BookCopy} tone="blue" />
        <MetricCard label="Quá hạn" value={dashboard.overdueLoans} detail="cần xử lý" icon={AlertTriangle} tone="red" />
        {user.role === 'admin' && <MetricCard label="Độc giả" value={dashboard.totalUsers} detail="tài khoản hệ thống" icon={Users} tone="violet" />}
        <MetricCard label="Đã hoàn tất" value={dashboard.returnedLoans} detail="lượt trả sách" icon={Clock3} tone="amber" />
        <MetricCard label="Đặt trước" value={dashboard.activeReservations} detail="yêu cầu đang hoạt động" icon={BookOpen} tone="violet" />
        {user.role === 'admin' && <MetricCard label="Tổng tiền phạt" value={`${Number(dashboard.totalFines || 0).toLocaleString('vi-VN')} ₫`} detail={`${dashboard.returnRequests || 0} yêu cầu trả · ${dashboard.renewalRequests || 0} gia hạn`} icon={AlertTriangle} tone="red" />}
      </section>

      <section className="panel trend-panel"><div className="section-heading"><div><p className="eyebrow dark">14 NGÀY GẦN NHẤT</p><h2>Xu hướng lượt mượn</h2></div></div><div className="trend-chart">{(dashboard.borrowTrend || []).map((item) => <div className="trend-column" key={item.date} title={`${item.date}: ${item.count} lượt`}><span style={{ height: `${Math.max(5, (item.count / maxTrend) * 100)}%` }} /><small>{item.date.slice(5)}</small></div>)}</div></section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="section-heading"><div><p className="eyebrow dark">PHÂN BỐ KHO SÁCH</p><h2>Thể loại nổi bật</h2></div></div>
          <div className="bar-list">
            {(dashboard.categories || []).map((item) => (
              <div className="bar-item" key={item.name}>
                <div><span>{item.name}</span><strong>{item.count}</strong></div>
                <div className="bar-track"><span style={{ width: `${Math.max(8, (item.count / maxCategory) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading"><div><p className="eyebrow dark">XẾP HẠNG</p><h2>Sách được quan tâm</h2></div></div>
          <div className="rank-list">
            {(dashboard.topBooks || []).map((book, index) => (
              <div className="rank-row" key={book.id}>
                <span className="rank-number">{index + 1}</span>
                <div className="rank-cover">
                  {book.cover ? <img src={mediaUrl(book.cover)} alt="" /> : <BookOpen size={18} />}
                </div>
                <div><strong>{book.title}</strong><small>{book.author}</small></div>
                <span className="borrow-count">{book.borrowCount} lượt</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-grid lower-grid">
        <div className="panel">
          <div className="section-heading">
            <div><p className="eyebrow dark">CẢNH BÁO</p><h2>Sắp đến hạn và quá hạn</h2></div>
            <button className="text-button" onClick={() => onNavigate('history')}>Xem tất cả</button>
          </div>
          {alerts.length === 0 ? (
            <div className="empty-state compact"><BookCheck size={34} /><p>Không có cảnh báo cần xử lý.</p></div>
          ) : (
            <div className="alert-list">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className={`dashboard-alert ${alert.severity}`}>
                  <AlertTriangle size={18} />
                  <div><strong>{alert.message}</strong><small>Phiếu mượn #{alert.id}</small></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="section-heading"><div><p className="eyebrow dark">GẦN ĐÂY</p><h2>Hoạt động mượn trả</h2></div></div>
          <div className="activity-list">
            {(dashboard.recentRecords || []).map((record) => (
              <div className="activity-row" key={record.id}>
                <span className={`activity-dot ${record.status}`} />
                <div><strong>{record.bookTitle}</strong><small>{record.customerName || 'Độc giả'} · Phiếu #{record.id}</small></div>
                <span className={`badge ${record.isOverdue ? 'overdue' : record.status === 'active' ? 'borrowed' : 'available'}`}>
                  {record.isOverdue ? 'Quá hạn' : record.status === 'active' ? 'Đang mượn' : 'Đã trả'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
