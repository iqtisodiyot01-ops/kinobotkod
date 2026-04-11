import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Channels() {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ channel_id: '', title: '', username: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('channels').select('*')
    if (err) console.error('Channels error:', err.message)
    setChannels(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault()
    if (!form.channel_id || !form.title) { setError('ID va nom majburiy!'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('channels').insert({
      channel_id: form.channel_id.trim(),
      title: form.title.trim(),
      username: form.username.trim() || null
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowAdd(false)
    setForm({ channel_id: '', title: '', username: '' })
    load()
  }

  const remove = async (id) => {
    if (!confirm('Kanalni o\'chirasizmi?')) return
    await supabase.from('channels').delete().eq('id', id)
    load()
  }

  return (
    <>
      <div className="page-title">Kanallar</div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Obuna kanallar ({channels.length})</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Qo'shish</button>
        </div>
        {loading ? <div className="loading">Yuklanmoqda...</div> : (
          <table>
            <thead>
              <tr>
                <th>Channel ID</th>
                <th>Nomi</th>
                <th>Username</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {channels.length === 0 && <tr><td colSpan={4} className="empty">Kanallar yo'q</td></tr>}
              {channels.map(ch => (
                <tr key={ch.id}>
                  <td><span className="badge badge-green">{ch.channel_id}</span></td>
                  <td>{ch.title}</td>
                  <td style={{ color: '#64748b' }}>{ch.username ? `@${ch.username}` : '—'}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(ch.id)}>O'chirish</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">Kanal qo'shish</div>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Channel ID * (masalan: -1001234567890)</label>
                <input className="form-input" placeholder="-100..." value={form.channel_id} onChange={e => setForm({ ...form, channel_id: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Nomi *</label>
                <input className="form-input" placeholder="Kanal nomi" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Username (@ siz)</label>
                <input className="form-input" placeholder="kinokod" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
              </div>
              {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn" style={{ background: '#2d3148', color: '#94a3b8' }} onClick={() => setShowAdd(false)}>Bekor</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
