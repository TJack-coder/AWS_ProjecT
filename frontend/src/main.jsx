import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Library, LogOut } from 'lucide-react';
import { libraryApi } from './api';
import Auth from './Auth';
import HomeTab from './components/HomeTab';
import BooksTab from './components/BooksTab';
import HistoryTab from './components/HistoryTab';
import BorrowModal from './components/BorrowModal';
import './styles.css';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [books, setBooks] = useState([]);
  const [history, setHistory] = useState([]);
  
  // State quản lý việc mượn sách (giữ ở cấp độ App để dùng ở nhiều Tab)
  const [borrowingBook, setBorrowingBook] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('library_token');
      if (token) {
        try {
          const userData = await libraryApi.getMe();
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('library_token');
        }
      }
    };
    checkAuth();
  }, []);

  const loadData = async () => {
    if (!user) return;
    try {
      const data = await libraryApi.getBooks();
      setBooks(data);
    } catch (error) {
      console.error("Lỗi tải danh sách sách:", error);
    }

    try {
      if (user.role === 'admin') {
        const historyData = await libraryApi.getBorrowRecords();
        setHistory(historyData);
      } else {
        const historyData = await libraryApi.getMyBorrowRecords();
        setHistory(historyData);
      }
    } catch (error) {
      console.error("Lỗi tải lịch sử mượn trả:", error);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const handleAuthSuccess = (res) => {
    localStorage.setItem('library_token', res.access_token);
    setUser(res.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('library_token');
    setUser(null);
    setBooks([]);
    setHistory([]);
    setActiveTab('home');
  };

  if (!user) {
    return <Auth onLoginSuccess={handleAuthSuccess} />;
  }

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
             <span>{user.fullName || user.username} ({user.role})</span>
             <button onClick={handleLogout} style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', color: '#ef4444', marginLeft: '8px', cursor: 'pointer' }} title="Đăng xuất">
                <LogOut size={16} />
             </button>
          </div>
        </div>
      </header>
      
      <main className="app-shell">
        {activeTab === 'home' && <HomeTab books={books} onBorrow={setBorrowingBook} />}
        {activeTab === 'books' && <BooksTab books={books} user={user} onRefresh={loadData} />}
        {activeTab === 'history' && <HistoryTab history={history} user={user} onRefresh={loadData} />}
      </main>

      {/* Modal Mượn sách có thể được kích hoạt từ bất kỳ Tab nào */}
      {borrowingBook && (
        <BorrowModal 
          book={borrowingBook} 
          user={user} 
          onClose={() => setBorrowingBook(null)} 
          onRefresh={loadData} 
        />
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);