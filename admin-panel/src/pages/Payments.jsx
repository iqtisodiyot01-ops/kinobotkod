import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, success: 0, amount: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ user_id: '', amount: '', provider: 'mock' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('payments').select('*, users(full_name, username)').order('created_at', { ascending: false }).limit(50)
    const rows = data || []
    setPayments(rows)
    const success = rows.filter(p => p.status === 'success')
    setStats({
      total: rows.length,
      success: success.length,
      amount: success.reduce((s, p) => s + (p.amount || 0), 0),
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (e) => {
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
          <table>
            <thead>
              <tr>
                <th>Foydalanuvchi</th>
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
                  <td>
                    <div>{p.users?.full_name || p.user_id}</div>
                    {p.users?.username && <div style={{ color: '#64748b', fontSize: 12 }}>@{p.users.username}</div>}
                  </td>
                  <td><b>{(p.amount || 0).toLocaleString()}</b> {p.currency}</td>
                  <td><span className="badge badge-blue">{p.provider}</span></td>
                  <td>{statusBadge(p.status)}</td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">Premium berish</div>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Telegram ID *</label>
                <input className="form-input" placeholder="7914882474" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Summa (UZS) *</label>
                <input className="form-input" type="number" placeholder="50000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Provider</label>
                <select className="form-input" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}>
                  <option value="mock">Mock (test)</option>
                  <option value="click">Click</option>
                  <option value="payme">Payme</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" style={{ background: '#2d3148', color: '#94a3b8' }} onClick={() => setShowAdd(false)}>Bekor</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : '💎 Premium berish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
