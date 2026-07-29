const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function mediaUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  if (value.startsWith('/assets/')) return value;
  if (value.startsWith('/uploads/') || value.startsWith('/media/')) return `${API_BASE_URL}${value}`;
  return value;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('library_token') || sessionStorage.getItem('library_token');
  const isForm = options.body instanceof FormData;
  const headers = { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.status === 401 && !['/auth/login', '/auth/register'].includes(path)) {
    localStorage.removeItem('library_token');
    sessionStorage.removeItem('library_token');
    window.dispatchEvent(new CustomEvent('library:session-expired'));
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => null) : await response.blob();
  if (!response.ok) throw new Error(data?.message || `Lỗi HTTP ${response.status}`);
  return data;
}

export const libraryApi = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),
  updateProfile: (payload) => request('/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  forgotPassword: (identity) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identity }) }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  uploadImage: (file) => {
    const body = new FormData();
    body.append('file', file);
    return request('/uploads', { method: 'POST', body });
  },

  getBooks: () => request('/books'),
  smartSearch: (query) => request(`/search?q=${encodeURIComponent(query)}`),
  getAdminBooks: () => request('/admin/books'),
  getBook: (id) => request(`/books/${id}`),
  createBook: (payload) => request('/books', { method: 'POST', body: JSON.stringify(payload) }),
  updateBook: (id, payload) => request(`/books/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteBook: (id) => request(`/books/${id}`, { method: 'DELETE' }),
  restoreBook: (id) => request(`/books/${id}/restore`, { method: 'POST' }),
  importBooks: (file) => { const body = new FormData(); body.append('file', file); return request('/books/import', { method: 'POST', body }); },
  bookQrUrl: (id) => `${API_BASE_URL}/books/${id}/qr`,

  getUsers: () => request('/users'),
  updateUserStatus: (id, isActive) => request(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
  resetUserPassword: (id, password) => request(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),

  borrowBook: (payload) => request('/borrow', { method: 'POST', body: JSON.stringify(payload) }),
  requestReturn: (recordId) => request(`/borrow-records/${recordId}/request-return`, { method: 'POST' }),
  approveReturn: (recordId, payload) => request(`/borrow-records/${recordId}/approve-return`, { method: 'POST', body: JSON.stringify(payload) }),
  renewBorrow: (recordId) => request(`/borrow-records/${recordId}/renew`, { method: 'POST' }),
  decideRenewal: (recordId, approved) => request(`/borrow-records/${recordId}/renew-decision`, { method: 'POST', body: JSON.stringify({ approved }) }),
  getBorrowRecords: () => request('/borrow-records'),
  getMyBorrowRecords: () => request('/my-borrow-records'),

  reserveBook: (bookId) => request(`/books/${bookId}/reservations`, { method: 'POST' }),
  getReservations: () => request('/reservations'),
  cancelReservation: (id) => request(`/reservations/${id}`, { method: 'DELETE' }),
  notifyReservation: (id) => request(`/reservations/${id}/notify`, { method: 'POST' }),

  getDashboard: () => request('/dashboard'),
  getAlerts: () => request('/alerts'),
  getRecommendations: () => request('/recommendations'),
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),
  getAuditLogs: () => request('/audit-logs'),
  chat: (message) => request('/assistant/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  reportUrl: (format) => `${API_BASE_URL}/reports/borrowings?format=${encodeURIComponent(format)}`,

  downloadFile: async (path, fallbackName) => {
    const token = localStorage.getItem('library_token') || sessionStorage.getItem('library_token');
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'Không thể tải báo cáo');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const filename = disposition.match(/filename=([^;]+)/)?.[1]?.replaceAll('"', '') || fallbackName;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  downloadReport(format) { return this.downloadFile(`/reports/borrowings?format=${format}`, `borrow-report.${format}`); },
  downloadBooks(format) { return this.downloadFile(`/reports/books?format=${format}`, `book-catalog.${format}`); },
};
