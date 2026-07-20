const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const token = localStorage.getItem('library_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Bộ đánh chặn 401: Xử lý token hết hạn
  if (response.status === 401) {
    localStorage.removeItem('library_token');
    alert('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
    window.location.reload();
    throw new Error('Phiên đăng nhập hết hạn');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Lỗi: ${response.status}`);
  }
  return data;
}

export const libraryApi = {
  // Authentication
  login: (username, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),
  getMe: () => request('/auth/me'),

  // Books Management
  getBooks: () => request('/books'),
  createBook: (payload) => request('/books', { method: 'POST', body: JSON.stringify(payload) }),
  deleteBook: (id) => request(`/books/${id}`, { method: 'DELETE' }),

  // Borrow & Return Management
  borrowBook: (payload) => request('/borrow', { method: 'POST', body: JSON.stringify(payload) }),
  returnBook: (payload) => request('/return', { method: 'POST', body: JSON.stringify(payload) }),
  getBorrowRecords: () => request('/borrow-records'),
  getMyBorrowRecords: () => request('/my-borrow-records'),
};