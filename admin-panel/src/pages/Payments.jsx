import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [paidMovies, setPaidMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, success: 0, amount: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ user_id: '', amount: '', provider: 'mock' })
  const [saving, setSaving] = useState(false)
  const [cardNumber, setCardNumber] = useState(() => localStorage.getItem('kk_card_number') || '')
  const [cardSaved, setCardSaved] = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data: pData, error: pErr }, { data: mData }] = await Promise.all([
      supabase.from('payments').select('*').limit(50),
      supabase.from('movies').select('code,title,price,is_paid').eq('is_paid', true),
    ])
    if (pErr) console.error('Payments error:', pErr.message)
    const rows = (pData || []).sort((a, b) => b.id - a.id)
    setPayments(rows)
    setPaidMovies(mData || [])
    const success = rows.filter(p => p.status === 'success')
    setStats({
      total: rows.length,
      success: success.length,
      amount: success.reduce((s, p) => s + (p.amount || 0), 0),
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
      amount: parseInt(form.amount),
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

  const statusBadge = (s) => {
    if (s === 'success') return <span className="badge badge-green">✅ Muvaffaqiyatli</span>
    if (s === 'pending') return <span className="badge badge-blue">⏳ Kutilmoqda</span>
    return <span className="badge" style={{ background: '#3d1f1f', color: '#f87171' }}>❌ {s}</span>
  }

  return (
    <>
      <div className="page-title">To'lovlar</div>

      <div className="card" style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 14, color: '#e2e8f0', fontSize: 16 }}>
          💳 To'lov karta raqami
        </div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
          Foydalanuvchilar to'lov qilishi uchun karta raqamingizni kiriting. Bu faqat admin panelda saqlanadi.
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
            borderRadius: 10, padding: '14px 20px', display: 'inline-block'
          }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>TO'LOV KARTASI</div>
            <div style={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 3, color: '#e2e8f0' }}>
              {cardNumber}
            </div>
          </div>
        )}
      </div>

      {paidMovies.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">💎 Pulli kinolar ({paidMovies.length})</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Kod</th><th>Nomi</th><th>Narxi</th></tr>
              </thead>
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

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="label">Jami to'lovlar</div>
          <div className="value">💳 {stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="label">Muvaffaqiyatli</div>
          <div className="value">✅ {stats.success}</div>
        </div>
        <div className="stat-card">
          <div className="label">Jami summa</div>
          <div className="value" style={{ fontSize: 20 }}>{stats.amount.toLocaleString()} UZS</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">To'lovlar tarixi</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Premium berish</button>
        </div>
        {loading ? <div className="loading">Yuklanmoqda...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Summa</th>
                  <th>Provider</th>
                  <th>Holat</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={5} className="empty">To'lovlar yo'q</td></tr>}
                {payments.map(p => (
                  <tr key={p.id}>
                    <td><span className="badge badge-blue">{p.user_id || p.telegram_id || '—'}</span></td>
                    <td><b>{(p.amount || 0).toLocaleString()}</b> {p.currency || 'UZS'}</td>
                    <td><span className="badge badge-blue">{p.provider || '—'}</span></td>
                    <td>{statusBadge(p.status)}</td>
                    <td style={{ color: '#64748b', fontSize: 12 }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
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
                <input className="form-input" placeholder="7914882474" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Summa (UZS)</label>
                <input className="form-input" type="number" placeholder="50000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Provider</label>
                <select className="form-input" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}>
                  <option value="mock">Mock (test)</option>
                  <option value="click">Click</option>
                  <option value="payme">Payme</option>
                  <option value="card">Karta orqali</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" style={{ background: '#2d3148', color: '#94a3b8' }} onClick={() => setShowAdd(false)}>Bekor</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saqlanmoqda...' : '💎 Premium berish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
