import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const PROVIDERS = ['', 'click', 'payme', 'card', 'mock']
const STATUSES = ['', 'success', 'pending', 'failed', 'refunded']

const providerColors = {
  click: { bg: '#0a1f3d', color: '#60a5fa', border: '#1d4ed8' },
  payme: { bg: '#0a2e1a', color: '#4ade80', border: '#166534' },
  card: { bg: '#1a1a2e', color: '#a78bfa', border: '#4c1d95' },
  mock: { bg: '#2d2f3e', color: '#94a3b8', border: '#374151' },
}

const statusColors = {
  success: { bg: '#0a2e1a', color: '#4ade80' },
  pending: { bg: '#0a1f3d', color: '#60a5fa' },
  failed: { bg: '#3d1f1f', color: '#f87171' },
  refunded: { bg: '#1a1a2e', color: '#a78bfa' },
}

function ProviderBadge({ p }) {
  const c = providerColors[p] || providerColors.mock
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
    }}>
      {p === 'click' ? '🔵 Click' : p === 'payme' ? '🟢 Payme' : p === 'card' ? '💳 Karta' : p || '—'}
    </span>
  )
}

function StatusBadge({ s }) {
  const c = statusColors[s] || { bg: '#2d2f3e', color: '#94a3b8' }
  const label = { success: '✅ Muvaffaqiyatli', pending: '⏳ Kutilmoqda', failed: '❌ Xato', refunded: '↩️ Qaytarildi' }
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...c }}>
      {label[s] || s || '—'}
    </span>
  )
}

function exportCsv(rows, userMap) {
  const header = ['ID', 'User ID', 'Ism', 'Summa', 'Valyuta', 'Provider', 'Holat', 'Sana']
  const lines = rows.map(p => {
    const uid = String(p.user_id || p.telegram_id || '')
    const u = userMap.get(uid)
    const name = u ? (u.full_name || u.first_name || u.username || '') : ''
    return [
      p.id,
      uid,
      name,
      p.amount || 0,
      p.currency || 'UZS',
      p.provider || '',
      p.status || '',
      p.created_at ? new Date(p.created_at).toLocaleString() : '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [users, setUsers] = useState([])
  const [userMap, setUserMap] = useState(new Map())
  const [paidMovies, setPaidMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, success: 0, amount: 0 })

  // Filters
  const [filterProvider, setFilterProvider] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchUser, setSearchUser] = useState('')

  // Manual premium form
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ user_id: '', amount: '', provider: 'mock' })
  const [saving, setSaving] = useState(false)

  // Card number
  const [cardNumber, setCardNumber] = useState(() => localStorage.getItem('kk_card_number') || '')
  const [cardSaved, setCardSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: pData }, { data: mData }, { data: uData }] = await Promise.all([
      supabase.from('payments').select('*').limit(200),
      supabase.from('movies').select('code,title,price,is_paid').eq('is_paid', true),
      supabase.from('users').select('telegram_id,user_id,full_name,first_name,username'),
    ])
    const rows = (pData || []).sort((a, b) => b.id - a.id)
    setPayments(rows)
    setPaidMovies(mData || [])

    const uList = uData || []
    setUsers(uList)
    const map = new Map()
    uList.forEach(u => {
      if (u.telegram_id) map.set(String(u.telegram_id), u)
      if (u.user_id) map.set(String(u.user_id), u)
    })
    setUserMap(map)

    const success = rows.filter(p => p.status === 'success')
    setStats({
      total: rows.length,
      success: success.length,
      amount: success.reduce((s, p) => s + (p.amount || 0), 0),
    })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = payments.filter(p => {
    const uid = String(p.user_id || p.telegram_id || '')
    const u = userMap.get(uid)
    const name = u ? (u.full_name || u.first_name || u.username || '') : ''
    const s = searchUser.toLowerCase()
    const matchUser = !s || uid.includes(s) || name.toLowerCase().includes(s)
    const matchProvider = !filterProvider || p.provider === filterProvider
    const matchStatus = !filterStatus || p.status === filterStatus
    const matchFrom = !dateFrom || new Date(p.created_at) >= new Date(dateFrom)
    const matchTo = !dateTo || new Date(p.created_at) <= new Date(dateTo + 'T23:59:59')
    return matchUser && matchProvider && matchStatus && matchFrom && matchTo
  })

  const saveCard = () => {
    localStorage.setItem('kk_card_number', cardNumber)
    setCardSaved(true)
    setTimeout(() => setCardSaved(false), 2000)
  }

  const savePremium = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('payments').insert({
      user_id: parseInt(form.user_id),
      amount: parseInt(form.amount) || 0,
      provider: form.provider,
      status: 'success',
      currency: 'UZS',
    })
    await supabase.from('users').update({ is_premium: true }).eq('telegram_id', parseInt(form.user_id))
    setSaving(false)
    setShowAdd(false)
    setForm({ user_id: '', amount: '', provider: 'mock' })
    load()
  }

  return (
    <>
      <div className="page-title">💳 To'lovlar</div>

      {/* Karta raqami */}
      <div className="card" style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: '#e2e8f0', fontSize: 15 }}>
          💳 To'lov karta raqami
        </div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
          Foydalanuvchilar to'lov qilishi uchun karta raqamingizni kiriting.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 200, letterSpacing: 2, fontFamily: 'monospace', fontSize: 16 }}
            placeholder="8600 1234 5678 9012"
            value={cardNumber}
            onChange={e => setCardNumber(e.target.value)}
            maxLength={19}
          />
          <button className="btn btn-primary" onClick={saveCard}>
            {cardSaved ? '✅ Saqlandi!' : '💾 Saqlash'}
          </button>
        </div>
        {cardNumber && (
          <div style={{
            marginTop: 14, background: '#0f172a', border: '1px solid #2d3148',
            borderRadius: 10, padding: '14px 20px', display: 'inline-block',
          }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>TO'LOV KARTASI</div>
            <div style={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 3, color: '#e2e8f0' }}>
              {cardNumber}
            </div>
          </div>
        )}
      </div>

      {/* Pulli kinolar */}
      {paidMovies.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">💎 Pulli kinolar ({paidMovies.length})</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Kod</th><th>Nomi</th><th>Narxi</th></tr></thead>
              <tbody>
                {paidMovies.map(m => (
                  <tr key={m.code}>
                    <td><span className="badge badge-blue">{m.code}</span></td>
                    <td>{m.title}</td>
                    <td>
                      <span className="badge" style={{ background: '#1a1a2e', color: '#a78bfa' }}>
                        💎 {(m.price || 0).toLocaleString()} UZS
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statistika */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="label">Jami to'lovlar</div>
          <div className="value">💳 {stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="label">Muvaffaqiyatli</div>
          <div className="value" style={{ color: '#4ade80' }}>✅ {stats.success}</div>
        </div>
        <div className="stat-card">
          <div className="label">Jami summa</div>
          <div className="value" style={{ fontSize: 18 }}>{stats.amount.toLocaleString()} UZS</div>
        </div>
        <div className="stat-card">
          <div className="label">Filtrlangan</div>
          <div className="value" style={{ color: '#a78bfa' }}>{filtered.length}</div>
        </div>
      </div>

      {/* Filtrlar */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>Provider</label>
            <select
              className="form-input"
              style={{ padding: '6px 10px', width: 130 }}
              value={filterProvider}
              onChange={e => setFilterProvider(e.target.value)}
            >
              <option value="">Barchasi</option>
              {PROVIDERS.filter(Boolean).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>Holat</label>
            <select
              className="form-input"
              style={{ padding: '6px 10px', width: 150 }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Barchasi</option>
              {STATUSES.filter(Boolean).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>Sana (boshidan)</label>
            <input
              type="date"
              className="form-input"
              style={{ padding: '6px 10px', width: 140 }}
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>Sana (oxirigacha)</label>
            <input
              type="date"
              className="form-input"
              style={{ padding: '6px 10px', width: 140 }}
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>Foydalanuvchi qidirish</label>
            <input
              className="form-input"
              style={{ padding: '6px 10px', width: 160 }}
              placeholder="ID, ism yoki username..."
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
            />
          </div>
          {(filterProvider || filterStatus || dateFrom || dateTo || searchUser) && (
            <button
              className="btn btn-sm"
              style={{ background: '#2d3148', color: '#94a3b8', alignSelf: 'flex-end' }}
              onClick={() => { setFilterProvider(''); setFilterStatus(''); setDateFrom(''); setDateTo(''); setSearchUser('') }}
            >
              ✕ Tozalash
            </button>
          )}
        </div>
      </div>

      {/* To'lovlar jadvali */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">To'lovlar tarixi ({filtered.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm"
              style={{ background: '#0a2e1a', color: '#4ade80', border: '1px solid #166534' }}
              onClick={() => exportCsv(filtered, userMap)}
            >
              📥 CSV yuklab olish
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAdd(true)}
            >
              + Premium berish
            </button>
          </div>
        </div>
        {loading ? (
          <div className="loading">Yuklanmoqda...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Foydalanuvchi</th>
                  <th>Summa</th>
                  <th>Provider</th>
                  <th>Holat</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={6} className="empty">To'lovlar topilmadi</td></tr>}
                {filtered.map(p => {
                  const uid = String(p.user_id || p.telegram_id || '')
                  const u = userMap.get(uid)
                  const name = u ? (u.full_name || u.first_name || null) : null
                  const username = u?.username || null
                  return (
                    <tr key={p.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>#{p.id}</span></td>
                      <td>
                        <div>
                          {name ? (
                            <div style={{ fontWeight: 500, fontSize: 14 }}>{name}</div>
                          ) : (
                            <div style={{ color: '#64748b', fontSize: 12 }}>—</div>
                          )}
                          {username && (
                            <div style={{ fontSize: 12 }}>
                              <a href={`https://t.me/${username}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
                                @{username}
                              </a>
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: '#475569' }}>#{uid}</div>
                        </div>
                      </td>
                      <td>
                        <b style={{ color: '#e2e8f0' }}>{(p.amount || 0).toLocaleString()}</b>{' '}
                        <span style={{ color: '#64748b', fontSize: 12 }}>{p.currency || 'UZS'}</span>
                      </td>
                      <td><ProviderBadge p={p.provider} /></td>
                      <td><StatusBadge s={p.status} /></td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>
                        {formatDateTime(p.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">💎 Premium berish</div>
            <form onSubmit={savePremium}>
              <div className="form-group">
                <label className="form-label">Telegram ID *</label>
                <input
                  className="form-input"
                  placeholder="7914882474"
                  value={form.user_id}
                  onChange={e => setForm(prev => ({ ...prev, user_id: e.target.value }))}
                  inputMode="numeric"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Summa (UZS)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="50000"
                  value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  inputMode="numeric"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Provider</label>
                <select
                  className="form-input"
                  value={form.provider}
                  onChange={e => setForm(prev => ({ ...prev, provider: e.target.value }))}
                >
                  <option value="mock">Mock (test)</option>
                  <option value="click">Click</option>
                  <option value="payme">Payme</option>
                  <option value="card">Karta orqali</option>
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#2d3148', color: '#94a3b8' }}
                  onClick={() => setShowAdd(false)}
                >
                  Bekor
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saqlanmoqda...' : '💎 Premium berish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
