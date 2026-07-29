import React from 'react';
import { BellRing, Clock3, Trash2 } from 'lucide-react';
import { libraryApi, mediaUrl } from '../api';

const labels = { waiting: 'Đang chờ', notified: 'Đã thông báo', fulfilled: 'Đã mượn', cancelled: 'Đã hủy', expired: 'Hết hạn' };
export default function ReservationsTab({ reservations, user, onRefresh }) {
  const action = async (fn) => { try { await fn(); await onRefresh(); } catch (error) { alert(error.message); } };
  return <div className="reservations-page">
    <div className="page-header"><div><p className="eyebrow dark">RESERVATION QUEUE</p><h1>{user.role === 'admin' ? 'Hàng chờ đặt trước' : 'Sách đã đặt trước'}</h1><p>Quản lý thứ tự ưu tiên và thời hạn nhận sách.</p></div></div>
    <section className="panel no-pad"><div className="table-container"><table className="data-table"><thead><tr><th>Sách</th>{user.role === 'admin' && <th>Độc giả</th>}<th>Vị trí</th><th>Trạng thái</th><th>Ngày tạo</th><th>Hành động</th></tr></thead><tbody>
      {reservations.map((item) => <tr key={item.id}><td><div className="table-book"><div className="table-cover"><img src={mediaUrl(item.bookCover)} alt="" /></div><strong>{item.bookTitle}</strong></div></td>{user.role === 'admin' && <td>{item.userName}<small className="block-muted">@{item.username}</small></td>}<td>{item.queuePosition ? `#${item.queuePosition}` : '—'}</td><td><span className={`badge ${item.status}`}>{labels[item.status] || item.status}</span></td><td>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</td><td><div className="action-cell">
        {user.role === 'admin' && item.status === 'waiting' && <button className="icon-btn-small" title="Thông báo đã có sách" onClick={() => action(() => libraryApi.notifyReservation(item.id))}><BellRing size={17}/></button>}
        {['waiting','notified'].includes(item.status) && <button className="icon-btn-small delete" title="Hủy" onClick={() => action(() => libraryApi.cancelReservation(item.id))}><Trash2 size={17}/></button>}
      </div></td></tr>)}
      {!reservations.length && <tr><td colSpan={user.role === 'admin' ? 6 : 5}><div className="empty-state"><Clock3 size={36}/><p>Chưa có yêu cầu đặt trước.</p></div></td></tr>}
    </tbody></table></div></section>
  </div>;
}
