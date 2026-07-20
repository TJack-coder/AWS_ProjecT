const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const libraryApi = {
  getBooks: () => request('/books'),
  getBook: (id) => request(`/books/${id}`),
  createBook: (payload) => request('/books', { method: 'POST', body: JSON.stringify(payload) }),
  updateBook: (id, payload) => request(`/books/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteBook: (id) => request(`/books/${id}`, { method: 'DELETE' }),
  borrowBook: (bookId, userId) => request('/borrow', { method: 'POST', body: JSON.stringify({ book_id: bookId, user_id: userId }) }),
  returnBook: (bookId, userId) => request('/return', { method: 'POST', body: JSON.stringify({ book_id: bookId, user_id: userId }) }),
  getBorrowRecords: () => request('/borrow-records'),
};

