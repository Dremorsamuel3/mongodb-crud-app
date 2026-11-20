const API = '/api/books';
const GENRES = ['Fiction', 'Nonfiction', 'Mystery', 'Science Fiction', 'Fantasy', 'Biography', 'History', 'Other'];
const emptyBook = { title: '', author: '', isbn: '', genre: 'Fiction', copies: 1, publishedYear: '', description: '' };

const state = { books: [], loading: true, search: '', genre: 'All', editing: null, deleting: null };
const $ = selector => document.querySelector(selector);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (response.status === 204) return null;
  let data;
  try { data = await response.json(); } catch { data = { message: 'Invalid server response' }; }
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  $('#toastStack').append(toast);
  setTimeout(() => toast.remove(), 3500);
}

async function loadBooks() {
  state.loading = true;
  render();
  try {
    const params = new URLSearchParams({ search: state.search, genre: state.genre });
    state.books = await request(`${API}?${params}`);
  } catch (error) { showToast(error.message, 'error'); }
  finally { state.loading = false; render(); loadStats(); }
}

async function loadStats() {
  try {
    const stats = await request('/api/stats');
    $('#statBooks').textContent = stats.totalBooks ?? 0;
    $('#statCopies').textContent = stats.totalCopies ?? 0;
    $('#statLow').textContent = stats.lowStock ?? 0;
  } catch { /* Dashboard remains usable if stats fail. */ }
}

function bookRow(book) {
  const stockClass = book.copies === 0 ? 'out' : book.copies <= 3 ? 'low' : 'good';
  const stockText = book.copies === 0 ? 'Unavailable' : book.copies <= 3 ? 'Low stock' : 'Available';
  return `<article class="book-row">
    <div class="book-main"><div class="book-cover">${escapeHtml(book.title[0]?.toUpperCase() || 'B')}</div><div><h3>${escapeHtml(book.title)}</h3><p>by ${escapeHtml(book.author)}</p></div></div>
    <div><span class="isbn">${escapeHtml(book.isbn)}</span></div>
    <div><span class="genre">${escapeHtml(book.genre)}</span></div>
    <div>${book.publishedYear || '—'}</div>
    <div><strong>${book.copies}</strong><span class="stock ${stockClass}">${stockText}</span></div>
    <div class="actions"><button class="icon-btn" data-edit="${book._id}" aria-label="Edit ${escapeHtml(book.title)}">✎</button><button class="icon-btn delete" data-delete="${book._id}" aria-label="Delete ${escapeHtml(book.title)}">×</button></div>
  </article>`;
}

function render() {
  $('#tableBody').innerHTML = state.loading
    ? '<div class="state"><span class="spinner"></span><p>Loading library…</p></div>'
    : state.books.length ? state.books.map(bookRow).join('')
    : `<div class="state"><div class="empty-book">▤</div><h3>No books found</h3><p>${state.search || state.genre !== 'All' ? 'Try adjusting your filters.' : 'Add the first book to your library.'}</p></div>`;
  $('#bookCount').textContent = state.loading ? '' : `${state.books.length} book${state.books.length === 1 ? '' : 's'} shown`;
}

function openBookModal(book = null) {
  state.editing = book;
  const values = book || emptyBook;
  $('#modalTitle').textContent = book ? 'Edit book' : 'Add a new book';
  $('#bookForm').innerHTML = `<div class="form-grid">
    <label class="full">Title *<input name="title" required maxlength="150" value="${escapeHtml(values.title)}"></label>
    <label>Author *<input name="author" required maxlength="100" value="${escapeHtml(values.author)}"></label>
    <label>ISBN *<input name="isbn" required maxlength="17" value="${escapeHtml(values.isbn)}"></label>
    <label>Genre *<select name="genre">${GENRES.map(g => `<option${g === values.genre ? ' selected' : ''}>${g}</option>`).join('')}</select></label>
    <label>Copies *<input name="copies" type="number" required min="0" max="10000" step="1" value="${values.copies}"></label>
    <label class="full">Publication year<input name="publishedYear" type="number" min="1000" max="${new Date().getFullYear()}" value="${values.publishedYear || ''}"></label>
    <label class="full">Description<textarea name="description" maxlength="500" rows="3">${escapeHtml(values.description || '')}</textarea></label>
  </div><p id="formError" class="form-error" role="alert"></p><div class="modal-actions"><button type="button" class="btn secondary" data-close>Cancel</button><button class="btn primary" type="submit">${book ? 'Save changes' : 'Add book'}</button></div>`;
  $('#bookModal').classList.add('open');
  $('#bookForm input')?.focus();
}

function closeBookModal() { $('#bookModal').classList.remove('open'); state.editing = null; }

$('#bookForm').addEventListener('submit', async event => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  submit.textContent = 'Saving…';
  const data = Object.fromEntries(new FormData(event.currentTarget));
  data.copies = Number(data.copies);
  data.publishedYear = data.publishedYear ? Number(data.publishedYear) : undefined;
  try {
    await request(state.editing ? `${API}/${state.editing._id}` : API, { method: state.editing ? 'PUT' : 'POST', body: JSON.stringify(data) });
    closeBookModal(); showToast(state.editing ? 'Book updated successfully.' : 'Book added to the library.'); loadBooks();
  } catch (error) { $('#formError').textContent = error.message; submit.disabled = false; submit.textContent = state.editing ? 'Save changes' : 'Add book'; }
});

$('#tableBody').addEventListener('click', event => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) openBookModal(state.books.find(book => book._id === editId));
  if (deleteId) {
    state.deleting = state.books.find(book => book._id === deleteId);
    $('#deleteName').textContent = state.deleting.title;
    $('#deleteModal').classList.add('open');
  }
});

$('#confirmDelete').addEventListener('click', async () => {
  if (!state.deleting) return;
  const button = $('#confirmDelete'); button.disabled = true;
  try {
    await request(`${API}/${state.deleting._id}`, { method: 'DELETE' });
    $('#deleteModal').classList.remove('open'); showToast('Book deleted.'); loadBooks();
  } catch (error) { showToast(error.message, 'error'); }
  finally { button.disabled = false; }
});

['click', 'keydown'].forEach(type => document.addEventListener(type, event => {
  if ((event.type === 'click' && event.target.dataset.close !== undefined) || (event.type === 'keydown' && event.key === 'Escape')) {
    closeBookModal(); $('#deleteModal').classList.remove('open');
  }
}));

$('#addBook').addEventListener('click', () => openBookModal());
$('#search').addEventListener('input', event => { state.search = event.target.value; clearTimeout(window.searchTimer); window.searchTimer = setTimeout(loadBooks, 250); });
$('#genreFilter').addEventListener('change', event => { state.genre = event.target.value; loadBooks(); });
$('#clearFilters').addEventListener('click', () => { state.search = ''; state.genre = 'All'; $('#search').value = ''; $('#genreFilter').value = 'All'; loadBooks(); });

$('#genreFilter').innerHTML = '<option>All</option>' + GENRES.map(g => `<option>${g}</option>`).join('');
loadBooks();
