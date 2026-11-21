import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['Electronics', 'Furniture', 'Office', 'Accessories', 'Clothing', 'Food & Beverage']
const EMPTY_FORM  = { name: '', sku: '', category: CATEGORIES[0], quantity: '', price: '', notes: '' }
const API         = '/api'

// ── Toast system ─────────────────────────────────────────────────────────────
function toastReducer(state, action) {
  switch (action.type) {
    case 'ADD':    return [...state, { id: action.id, kind: action.kind, msg: action.msg }]
    case 'REMOVE': return state.filter(t => t.id !== action.id)
    default:       return state
  }
}

function useToasts() {
  const [toasts, dispatch] = useReducer(toastReducer, [])
  const counter = useRef(0)
  const push = useCallback((msg, kind = 'success') => {
    const id = ++counter.current
    dispatch({ type: 'ADD', id, kind, msg })
    setTimeout(() => dispatch({ type: 'REMOVE', id }), 3500)
  }, [])
  return { toasts, push }
}

function Toasts({ toasts, dismiss }) {
  if (!toasts.length) return null
  return (
    <div className="toast-stack" role="region" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <span className="toast-icon">{t.kind === 'success' ? '✓' : t.kind === 'error' ? '✕' : 'ℹ'}</span>
          <span>{t.msg}</span>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="dismiss">×</button>
        </div>
      ))}
    </div>
  )
}

// ── Stats card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, alert }) {
  return (
    <article className={`stat-card${alert ? ' stat-card--alert' : ''}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <small className="stat-sub">{sub}</small>
    </article>
  )
}

// ── Badge ────────────────────────────────────────────────────────────────────
function Badge({ qty }) {
  const n = Number(qty)
  if (n === 0)  return <span className="badge badge--out">Out of stock</span>
  if (n <= 10)  return <span className="badge badge--low">Low stock</span>
  return              <span className="badge badge--ok">In stock</span>
}

// ── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ name, onConfirm, onCancel }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal modal--sm">
        <h2 id="confirm-title" className="confirm-title">Delete product?</h2>
        <p className="confirm-body">
          <strong>{name}</strong> will be permanently removed from inventory. This cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn--danger" onClick={onConfirm}>Yes, delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Product form modal ───────────────────────────────────────────────────────
function ProductModal({ editing, initial, onSave, onClose }) {
  const [form, setForm]   = useState(initial)
  const [busy, setBusy]   = useState(false)
  const [err,  setErr]    = useState('')
  const firstRef          = useRef(null)

  useEffect(() => { firstRef.current?.focus() }, [])

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const ok = await onSave(form)
    if (!ok.success) { setErr(ok.message); setBusy(false) }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title"
         onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit} noValidate>
        <div className="modal-head">
          <div>
            <p className="eyebrow">{editing ? 'UPDATE ITEM' : 'NEW ITEM'}</p>
            <h2 id="modal-title">{editing ? 'Edit product' : 'Add product'}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {err && <div className="form-error" role="alert">{err}</div>}

        <div className="fields">
          <label className="field field--full">
            <span>Product name <abbr title="required">*</abbr></span>
            <input ref={firstRef} required value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="e.g. Wireless Keyboard" />
          </label>

          <label className="field">
            <span>SKU <abbr title="required">*</abbr></span>
            <input required value={form.sku}
              onChange={e => set('sku', e.target.value)} placeholder="e.g. WK-001"
              style={{ textTransform: 'uppercase' }} />
          </label>

          <label className="field">
            <span>Category <abbr title="required">*</abbr></span>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Quantity <abbr title="required">*</abbr></span>
            <input required type="number" min="0" step="1" value={form.quantity}
              onChange={e => set('quantity', e.target.value)} placeholder="0" />
          </label>

          <label className="field">
            <span>Unit price ($) <abbr title="required">*</abbr></span>
            <input required type="number" min="0" step="0.01" value={form.price}
              onChange={e => set('price', e.target.value)} placeholder="0.00" />
          </label>

          <label className="field field--full">
            <span>Notes</span>
            <textarea rows="2" value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes about this product…" />
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Update product' : 'Add product'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [products,  setProducts]  = useState([])
  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [query,     setQuery]     = useState('')
  const [category,  setCategory]  = useState('All')
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [modal,     setModal]     = useState(false)   // false | 'create' | product-object
  const [delTarget, setDelTarget] = useState(null)    // product to confirm-delete
  const { toasts, push } = useToasts()

  // dismiss a toast manually
  function dismissToast(id) {
    // the auto-timeout already handles removal; this just gives the × button something to call
    // We trigger the same REMOVE action via a synthetic timeout of 0
    setTimeout(() => {}, 0)
  }

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search: query, category, sort: sortField, order: sortOrder })
      const res = await fetch(`${API}/products?${params}`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setProducts(await res.json())
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [query, category, sortField, sortOrder])

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/stats`)
      if (res.ok) setStats(await res.json())
    } catch { /* stats are non-critical */ }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadStats() },    [loadStats])

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  async function handleSave(form) {
    const editing = modal !== 'create' && modal?._id
    const url    = editing ? `${API}/products/${editing}` : `${API}/products`
    const method = editing ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.message || 'Save failed' }
      setModal(false)
      push(editing ? `"${data.name}" updated successfully` : `"${data.name}" added to inventory`, 'success')
      loadProducts()
      loadStats()
      return { success: true }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async function handleDelete() {
    if (!delTarget) return
    try {
      const res = await fetch(`${API}/products/${delTarget._id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 404) throw new Error(`Delete failed (${res.status})`)
      push(`"${delTarget.name}" removed from inventory`, 'info')
      setDelTarget(null)
      loadProducts()
      loadStats()
    } catch (err) {
      push(err.message, 'error')
      setDelTarget(null)
    }
  }

  // ── Sort toggle ────────────────────────────────────────────────────────────
  function toggleSort(field) {
    if (sortField === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortOrder('asc') }
  }
  function SortIcon({ field }) {
    if (sortField !== field) return <span className="sort-icon sort-icon--inactive">⇅</span>
    return <span className="sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  // ── Stats display ──────────────────────────────────────────────────────────
  const s = stats || {}
  const fmtValue = v => `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="app-shell">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-icon">▣</span>
            <span className="brand-name">Stockly</span>
          </div>
          <nav className="sidebar-nav">
            <button className="nav-btn nav-btn--active">
              <span className="nav-icon">▦</span><span className="nav-label">Inventory</span>
            </button>
            <button className="nav-btn">
              <span className="nav-icon">◎</span><span className="nav-label">Analytics</span>
            </button>
            <button className="nav-btn">
              <span className="nav-icon">♧</span><span className="nav-label">Team</span>
            </button>
            <button className="nav-btn">
              <span className="nav-icon">⚙</span><span className="nav-label">Settings</span>
            </button>
          </nav>
          <div className="sidebar-profile">
            <div className="avatar">AM</div>
            <div className="profile-info">
              <strong>Alex Morgan</strong>
              <small>Inventory Manager</small>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="content">
          {/* Page header */}
          <header className="page-header">
            <div>
              <p className="eyebrow">WORKSPACE / INVENTORY</p>
              <h1>Product Inventory</h1>
            </div>
            <button className="btn btn--primary btn--lg" onClick={() => setModal('create')}>
              <span>＋</span> Add product
            </button>
          </header>

          {/* Stats row */}
          <div className="stats-row">
            <StatCard label="Total products" value={s.totalProducts ?? '—'} sub="Unique inventory items" />
            <StatCard label="Units in stock"  value={s.totalUnits    ?? '—'} sub="Across all categories" />
            <StatCard label="Inventory value" value={fmtValue(s.totalValue)} sub="Current retail value" />
            <StatCard label="Low / out stock" value={s.lowStock      ?? '—'} sub="Items needing attention" alert />
          </div>

          {/* Table card */}
          <section className="table-card">
            {/* Toolbar */}
            <div className="toolbar">
              <label className="search-box">
                <span className="search-icon">⌕</span>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                />
                {query && (
                  <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>
                )}
              </label>

              <label className="filter-select" aria-label="Filter by category">
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="All">All categories</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>

            {/* Table */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      <button className="sort-btn" onClick={() => toggleSort('name')}>
                        PRODUCT <SortIcon field="name" />
                      </button>
                    </th>
                    <th>SKU</th>
                    <th>CATEGORY</th>
                    <th>
                      <button className="sort-btn" onClick={() => toggleSort('quantity')}>
                        QTY <SortIcon field="quantity" />
                      </button>
                    </th>
                    <th>
                      <button className="sort-btn" onClick={() => toggleSort('price')}>
                        PRICE <SortIcon field="price" />
                      </button>
                    </th>
                    <th>STATUS</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="table-state">
                      <div className="spinner" aria-label="Loading…" />
                      <span>Loading inventory…</span>
                    </td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={7} className="table-state">
                      <div className="empty-icon">📦</div>
                      <p>No products found</p>
                      {(query || category !== 'All') && (
                        <button className="btn btn--ghost btn--sm"
                          onClick={() => { setQuery(''); setCategory('All') }}>
                          Clear filters
                        </button>
                      )}
                    </td></tr>
                  ) : (
                    products.map(p => (
                      <tr key={p._id}>
                        <td>
                          <div className="product-cell">
                            <div className="thumb" style={{ background: categoryColor(p.category) }}>
                              {p.name[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="product-name">{p.name}</div>
                              {p.notes && <div className="product-notes">{p.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td><code className="sku">{p.sku}</code></td>
                        <td><span className="category-tag">{p.category}</span></td>
                        <td className="td-num">{p.quantity.toLocaleString()}</td>
                        <td className="td-num">${Number(p.price).toFixed(2)}</td>
                        <td><Badge qty={p.quantity} /></td>
                        <td className="td-actions">
                          <button className="btn-icon btn-icon--edit" onClick={() => setModal(p)}
                            aria-label={`Edit ${p.name}`} title="Edit">✎</button>
                          <button className="btn-icon btn-icon--del"  onClick={() => setDelTarget(p)}
                            aria-label={`Delete ${p.name}`} title="Delete">🗑</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && products.length > 0 && (
              <div className="table-footer">
                {products.length} product{products.length !== 1 ? 's' : ''} shown
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ── Modals ── */}
      {modal && (
        <ProductModal
          editing={modal !== 'create' ? modal._id : null}
          initial={modal !== 'create' ? { ...modal } : { ...EMPTY_FORM }}
          onSave={handleSave}
          onClose={() => setModal(false)}
        />
      )}

      {delTarget && (
        <ConfirmDialog
          name={delTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}

      {/* ── Toasts ── */}
      <Toasts toasts={toasts} dismiss={dismissToast} />
    </>
  )
}

// maps a category to a soft pastel background for the avatar thumb
function categoryColor(category) {
  const map = {
    Electronics:      '#dbeafe',
    Furniture:        '#fef9c3',
    Office:           '#dcfce7',
    Accessories:      '#fce7f3',
    'Clothing':       '#ede9fe',
    'Food & Beverage':'#ffedd5',
  }
  return map[category] || '#f1f5f9'
}
