import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell,
  BookOpen,
  Bot,
  Gauge,
  Library,
  ListChecks,
  LogOut,
  ScrollText,
  Settings2,
  UserCog,
  UserRound,
  X,
} from 'lucide-react';
import { libraryApi, mediaUrl } from './api';
import Auth from './Auth';
import DashboardTab from './components/DashboardTab';
import HomeTab from './components/HomeTab';
import BooksTab from './components/BooksTab';
import HistoryTab from './components/HistoryTab';
import BorrowModal from './components/BorrowModal';
import ProfileTab from './components/ProfileTab';
import ReservationsTab from './components/ReservationsTab';
import AdminOpsTab from './components/AdminOpsTab';
import ChatWidget from './components/ChatWidget';
import './styles.css';

const TAB_PATHS = {
  dashboard: '/dashboard', catalog: '/books', manage: '/admin/books', history: '/my-books',
  reservations: '/reservations', admin: '/admin/system', profile: '/profile',
};
function tabFromPath(path, role) {
  if (path.startsWith('/admin/books')) return role === 'admin' ? 'manage' : 'catalog';
  if (path.startsWith('/admin/system')) return role === 'admin' ? 'admin' : 'dashboard';
  if (path.startsWith('/loans') || path.startsWith('/my-books')) return 'history';
  if (path.startsWith('/reservations')) return 'reservations';
  if (path.startsWith('/profile')) return 'profile';
  if (path.startsWith('/books')) return 'catalog';
  return 'dashboard';
}

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTabState] = useState('dashboard');
  const [books, setBooks] = useState([]);
  const [adminBooks, setAdminBooks] = useState([]);
  const [history, setHistory] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);
  const [audits, setAudits] = useState([]);
  const [borrowingBook, setBorrowingBook] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatBook, setChatBook] = useState(null);

  const initialBookId = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('book');
    return value ? Number(value) : null;
  }, []);

  const setActiveTab = (tab, replace = false) => {
    setActiveTabState(tab);
    const path = tab === 'history' && user?.role === 'admin' ? '/loans' : (TAB_PATHS[tab] || '/dashboard');
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({ tab }, '', path);
  };

  useEffect(() => {
    const expire = () => {
      localStorage.removeItem('library_token'); sessionStorage.removeItem('library_token');
      setUser(null); setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      window.history.replaceState({}, '', '/login');
    };
    window.addEventListener('library:session-expired', expire);
    return () => window.removeEventListener('library:session-expired', expire);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('library_token') || sessionStorage.getItem('library_token');
      if (!token) { if (!window.location.pathname.startsWith('/reset-password')) window.history.replaceState({}, '', '/login'); return; }
      try {
        const current = await libraryApi.getMe();
        setUser(current);
        setActiveTabState(tabFromPath(window.location.pathname, current.role));
      } catch {
        localStorage.removeItem('library_token'); sessionStorage.removeItem('library_token');
        window.history.replaceState({}, '', '/login');
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const pop = () => user && setActiveTabState(tabFromPath(window.location.pathname, user.role));
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const calls = [
        libraryApi.getBooks(),
        user.role === 'admin' ? libraryApi.getBorrowRecords() : libraryApi.getMyBorrowRecords(),
        libraryApi.getDashboard(), libraryApi.getAlerts(), libraryApi.getRecommendations(),
        libraryApi.getNotifications(), libraryApi.getReservations(),
      ];
      if (user.role === 'admin') calls.push(libraryApi.getAdminBooks(), libraryApi.getUsers(), libraryApi.getAuditLogs());
      const [bookData, historyData, dashboardData, alertData, recommendationData, notificationData, reservationData, allBooks, userData, auditData] = await Promise.all(calls);
      setBooks(bookData); setHistory(historyData); setDashboard(dashboardData); setAlerts(alertData);
      setRecommendations(recommendationData); setNotifications(notificationData); setReservations(reservationData);
      setAdminBooks(user.role === 'admin' ? allBooks : bookData);
      setUsers(user.role === 'admin' ? userData : []); setAudits(user.role === 'admin' ? auditData : []);
    } catch (loadError) { setError(loadError.message || 'Không thể tải dữ liệu hệ thống.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (user) loadData(); }, [user]);

  const handleAuthSuccess = (response, remember = true) => {
    (remember ? localStorage : sessionStorage).setItem('library_token', response.access_token);
    setUser(response.user); setError('');
    setActiveTabState('dashboard'); window.history.replaceState({ tab: 'dashboard' }, '', '/dashboard');
  };
  const handleLogout = () => {
    localStorage.removeItem('library_token'); sessionStorage.removeItem('library_token');
    setUser(null); setBooks([]); setHistory([]); setDashboard(null); setNotifications([]);
    window.history.replaceState({}, '', '/login');
  };
  const reserve = async (book) => {
    try { await libraryApi.reserveBook(book.id); await loadData(); alert(`Đã đặt trước “${book.title}”.`); }
    catch (reserveError) { alert(reserveError.message); }
  };
  const openChatBook = (book) => { setChatBook(book); setActiveTab('catalog'); };

  if (!user) return <Auth onLoginSuccess={handleAuthSuccess} initialError={error} />;

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge },
    { id: 'catalog', label: 'Kho sách', icon: BookOpen },
    ...(user.role === 'admin' ? [{ id: 'manage', label: 'Quản lý sách', icon: Settings2 }] : []),
    { id: 'history', label: user.role === 'admin' ? 'Mượn / Trả' : 'Sách của tôi', icon: ScrollText },
    { id: 'reservations', label: 'Đặt trước', icon: ListChecks },
    ...(user.role === 'admin' ? [{ id: 'admin', label: 'Hệ thống', icon: UserCog }] : []),
  ];
  const unreadCount = notifications.filter((item) => !item.isRead).length + alerts.length;

  return <>
    <header className="top-nav"><div className="nav-container">
      <button className="logo-button" onClick={() => setActiveTab('dashboard')}><Library size={25}/><span>CloudLibrary</span></button>
      <nav className="nav-links" aria-label="Điều hướng chính">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab===id?'active':''} onClick={()=>setActiveTab(id)}><Icon size={17}/>{label}</button>)}</nav>
      <div className="nav-user-area">
        <div className="notification-wrap"><button className="nav-icon-button" onClick={()=>setShowAlerts((v)=>!v)} title="Thông báo"><Bell size={19}/>{unreadCount>0&&<span className="notification-count">{unreadCount}</span>}</button>{showAlerts&&<div className="notification-popover wide-popover"><div className="popover-header"><strong>Trung tâm thông báo</strong><div><button className="link-button" onClick={async()=>{await libraryApi.markAllNotificationsRead();await loadData();}}>Đọc tất cả</button><button className="icon-btn-small" onClick={()=>setShowAlerts(false)}><X size={18}/></button></div></div>{[...alerts.map((a)=>({...a,title:'Cảnh báo hạn trả',createdAt:null,isRead:false})),...notifications].slice(0,12).map((item,index)=><button key={`${item.id}-${index}`} className={`alert-row ${item.severity||item.type||'info'} ${item.isRead?'read':''}`} onClick={async()=>{if(item.createdAt&&!item.isRead)await libraryApi.markNotificationRead(item.id);setShowAlerts(false);if(item.link?.includes('reservation'))setActiveTab('reservations');else if(item.link?.includes('my-books')||item.link?.includes('loans'))setActiveTab('history');await loadData();}}><span><strong>{item.title||'Thông báo'}</strong><small>{item.message}</small></span>{item.createdAt&&<time>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</time>}</button>)}{!alerts.length&&!notifications.length&&<p className="empty-small">Chưa có thông báo mới.</p>}</div>}</div>
        <button className="user-chip user-chip-button" onClick={()=>setActiveTab('profile')}><span className="user-avatar">{user.avatar?<img src={mediaUrl(user.avatar)} alt=""/>:(user.fullName||user.username).charAt(0).toUpperCase()}</span><span><strong>{user.fullName||user.username}</strong><small>{user.role==='admin'?'Quản trị viên':'Độc giả'}</small></span></button>
        <button className="nav-icon-button logout" onClick={handleLogout} title="Đăng xuất"><LogOut size={18}/></button>
      </div>
    </div></header>
    <main className="app-shell">{error&&<div className="global-error">{error}<button onClick={loadData}>Thử lại</button></div>}{loading&&<div className="loading-bar"><span/></div>}
      {activeTab==='dashboard'&&<DashboardTab dashboard={dashboard} alerts={alerts} user={user} onNavigate={setActiveTab}/>} 
      {activeTab==='catalog'&&<HomeTab books={books} recommendations={recommendations} user={user} onBorrow={setBorrowingBook} onReserve={reserve} initialBookId={chatBook?.id||initialBookId}/>} 
      {activeTab==='manage'&&user.role==='admin'&&<BooksTab books={adminBooks} onRefresh={loadData}/>} 
      {activeTab==='history'&&<HistoryTab history={history} user={user} onRefresh={loadData}/>} 
      {activeTab==='reservations'&&<ReservationsTab reservations={reservations} user={user} onRefresh={loadData}/>} 
      {activeTab==='admin'&&user.role==='admin'&&<AdminOpsTab users={users} audits={audits} onRefresh={loadData}/>} 
      {activeTab==='profile'&&<ProfileTab user={user} onUserChange={setUser}/>} 
    </main>
    {borrowingBook&&<BorrowModal books={[borrowingBook]} user={user} onClose={()=>setBorrowingBook(null)} onRefresh={loadData}/>} 
    <ChatWidget onOpenBook={openChatBook}/>
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
