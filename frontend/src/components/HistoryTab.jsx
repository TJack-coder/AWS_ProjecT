import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, RefreshCw, Search, Undo2, X } from 'lucide-react';
import { libraryApi, mediaUrl } from '../api';

const PAGE_SIZE = 12;
function statusOf(record) {
  if (record.status === 'returned') return 'returned';
  if (record.status === 'lost') return 'lost';
  if (record.status === 'return_requested') return 'return_requested';
  if (record.isOverdue) return 'overdue';
  if (record.daysRemaining !== null && record.daysRemaining <= 3) return 'due_soon';
  return 'active';
}
const labels = { active:'Đang mượn', due_soon:'Sắp đến hạn', overdue:'Quá hạn', return_requested:'Chờ nhận trả', returned:'Đã trả', lost:'Mất sách' };
function StatusBadge({ record }) { const status=statusOf(record); return <span className={`badge ${status}`}>{labels[status]}</span>; }

export default function HistoryTab({ history, user, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [workingId, setWorkingId] = useState(null);
  const [returnModal, setReturnModal] = useState(null);
  const [returnForm, setReturnForm] = useState({ condition:'good', fineAmount:0, note:'' });

  const filtered = useMemo(() => [...history].filter((record) => {
    const keyword=search.trim().toLowerCase();
    const searchable=[record.id,record.customerName,record.bookTitle,record.phone].filter(Boolean).join(' ').toLowerCase();
    return (!keyword||searchable.includes(keyword)) && (status==='all'||statusOf(record)===status);
  }).sort((a,b)=>new Date(b.borrow_date)-new Date(a.borrow_date)),[history,search,status]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const pageRecords=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  useEffect(()=>setCurrentPage(1),[search,status]);
  useEffect(()=>{if(currentPage>totalPages)setCurrentPage(totalPages);},[currentPage,totalPages]);

  const run=async(record,action)=>{setWorkingId(record.id);try{
    if(action==='return-request') await libraryApi.requestReturn(record.id);
    if(action==='renew') await libraryApi.renewBorrow(record.id);
    if(action==='approve-renew') await libraryApi.decideRenewal(record.id,true);
    if(action==='reject-renew') await libraryApi.decideRenewal(record.id,false);
    await onRefresh(); setSelected(null);
  }catch(error){alert(error.message);}finally{setWorkingId(null);}};
  const approveReturn=async()=>{setWorkingId(returnModal.id);try{await libraryApi.approveReturn(returnModal.id,{...returnForm,fineAmount:Number(returnForm.fineAmount||0)});setReturnModal(null);await onRefresh();}catch(error){alert(error.message);}finally{setWorkingId(null);}};

  const stats={active:history.filter(r=>r.status==='active').length,returnRequested:history.filter(r=>r.status==='return_requested').length,overdue:history.filter(r=>r.isOverdue).length,pendingRenew:history.filter(r=>r.renewalStatus==='pending').length};
  return <div className="history-page">
    <div className="page-header"><div><p className="eyebrow dark">{user.role==='admin'?'LOAN OPERATIONS':'MY LIBRARY'}</p><h1>{user.role==='admin'?'Quản lý mượn / trả':'Sách của tôi'}</h1><p>{user.role==='admin'?'Duyệt gia hạn, tiếp nhận sách trả và ghi nhận tình trạng thực tế.':'Theo dõi hạn trả, yêu cầu gia hạn hoặc gửi yêu cầu trả sách.'}</p></div></div>
    <section className="mini-stat-grid"><div><span>Đang mượn</span><strong>{stats.active}</strong></div><div><span>Chờ nhận trả</span><strong>{stats.returnRequested}</strong></div><div><span>Quá hạn</span><strong>{stats.overdue}</strong></div><div><span>Chờ duyệt gia hạn</span><strong>{stats.pendingRenew}</strong></div></section>
    <section className="panel no-pad"><div className="management-toolbar"><div className="search-box toolbar-search"><Search size={18}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Tìm phiếu, độc giả hoặc tên sách..."/></div><label className="select-control"><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="all">Mọi trạng thái</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
      <div className="table-container"><table className="data-table"><thead><tr><th>Phiếu</th><th>Sách</th>{user.role==='admin'&&<th>Độc giả</th>}<th>Thời hạn</th><th>Trạng thái</th><th>Phí</th><th>Hành động</th></tr></thead><tbody>{pageRecords.map((record)=><tr key={record.id}><td className="font-mono">#{record.id}</td><td><div className="table-book"><div className="table-cover"><img src={mediaUrl(record.bookCover)} alt=""/></div><div><strong>{record.bookTitle}</strong><small>{record.bookCategory}</small></div></div></td>{user.role==='admin'&&<td>{record.customerName}<small className="block-muted">{record.phone}</small></td>}<td><strong>{record.expectedReturnDate}</strong><small className="block-muted">{record.daysRemaining!==null?(record.daysRemaining<0?`Quá ${Math.abs(record.daysRemaining)} ngày`:`Còn ${record.daysRemaining} ngày`):'Đã kết thúc'}</small></td><td><StatusBadge record={record}/>{record.renewalStatus==='pending'&&<span className="badge pending">Chờ gia hạn</span>}</td><td>{Number(record.fineAmount||0).toLocaleString('vi-VN')} VNĐ</td><td><div className="action-cell">
        {user.role==='user'&&record.status==='active'&&<><button className="icon-btn-small" disabled={workingId===record.id||record.renewalStatus==='pending'} title="Yêu cầu gia hạn" onClick={()=>run(record,'renew')}><RefreshCw size={17}/></button><button className="icon-btn-small" disabled={workingId===record.id} title="Yêu cầu trả" onClick={()=>run(record,'return-request')}><Undo2 size={17}/></button></>}
        {user.role==='admin'&&record.renewalStatus==='pending'&&<><button className="icon-btn-small restore" title="Duyệt gia hạn" onClick={()=>run(record,'approve-renew')}><CheckCircle2 size={17}/></button><button className="icon-btn-small delete" title="Từ chối" onClick={()=>run(record,'reject-renew')}><X size={17}/></button></>}
        {user.role==='admin'&&['active','return_requested'].includes(record.status)&&<button className="text-button compact" onClick={()=>{setReturnModal(record);setReturnForm({condition:'good',fineAmount:0,note:''});}}>Nhận trả</button>}
        <button className="icon-btn-small" onClick={()=>setSelected(record)} title="Chi tiết"><Clock3 size={17}/></button>
      </div></td></tr>)}{!pageRecords.length&&<tr><td colSpan={user.role==='admin'?7:6}><div className="empty-state"><Clock3 size={36}/><p>Không có phiếu phù hợp.</p></div></td></tr>}</tbody></table></div>
      {totalPages>1&&<div className="pagination"><button disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)}><ChevronLeft size={18}/>Trước</button><span>Trang <strong>{currentPage}</strong> / {totalPages}</span><button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)}>Sau<ChevronRight size={18}/></button></div>}
    </section>
    {selected&&<div className="drawer-overlay" onClick={()=>setSelected(null)}><aside className="detail-drawer" onClick={(e)=>e.stopPropagation()}><button className="drawer-close" onClick={()=>setSelected(null)}><X size={20}/></button><img className="drawer-cover" src={mediaUrl(selected.bookCover)} alt=""/><h2>{selected.bookTitle}</h2><StatusBadge record={selected}/><dl className="detail-list"><div><dt>Mã phiếu</dt><dd>#{selected.id}</dd></div><div><dt>Ngày mượn</dt><dd>{new Date(selected.borrow_date).toLocaleDateString('vi-VN')}</dd></div><div><dt>Hạn trả</dt><dd>{selected.expectedReturnDate}</dd></div><div><dt>Số lần gia hạn</dt><dd>{selected.renewCount}/2</dd></div><div><dt>Tình trạng trả</dt><dd>{selected.returnCondition||'Chưa trả'}</dd></div><div><dt>Tiền phạt</dt><dd>{Number(selected.fineAmount||0).toLocaleString('vi-VN')} VNĐ</dd></div></dl>{selected.adminNote&&<div className="note-box">{selected.adminNote}</div>}</aside></div>}
    {returnModal&&<div className="modal-overlay" onClick={()=>setReturnModal(null)}><div className="modal-content" onClick={(e)=>e.stopPropagation()}><button className="modal-close" onClick={()=>setReturnModal(null)}><X size={20}/></button><div className="modal-heading"><p className="eyebrow dark">RETURN INSPECTION</p><h2>Tiếp nhận sách trả</h2><p>{returnModal.bookTitle} · {returnModal.customerName}</p></div><div className="modal-form"><label>Tình trạng sách<select value={returnForm.condition} onChange={(e)=>setReturnForm({...returnForm,condition:e.target.value})}><option value="good">Bình thường</option><option value="minor_damage">Hư hỏng nhẹ</option><option value="major_damage">Hư hỏng nặng</option><option value="lost">Mất sách</option></select></label><label>Tiền phạt (VNĐ)<input type="number" min="0" step="1000" value={returnForm.fineAmount} onChange={(e)=>setReturnForm({...returnForm,fineAmount:e.target.value})}/></label><label>Ghi chú<textarea rows="4" value={returnForm.note} onChange={(e)=>setReturnForm({...returnForm,note:e.target.value})}/></label><div className="modal-actions"><button className="ghost-button" onClick={()=>setReturnModal(null)}>Hủy</button><button className="primary-button" disabled={workingId===returnModal.id} onClick={approveReturn}>{workingId===returnModal.id?'Đang xử lý...':'Xác nhận đã nhận sách'}</button></div></div></div></div>}
  </div>;
}
