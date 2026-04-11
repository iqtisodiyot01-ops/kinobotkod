import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Channels() {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', username: '' })
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
    if (!form.title.trim() || !form.username.trim()) {
      setError('Nomi va username majburiy!')
      return
    }
    setSaving(true)
    setError('')
    const username = form.username.trim().replace(/^@/, '')
    const channel_id = '@' + username
    const { error: err } = await supabase.from('channels').insert({
      channel_id,
      title: form.title.trim(),
      username,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowAdd(false)
    setForm({ title: '', username: '' })
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
          <button className="btn btn-primary btn-sm" onClick={() => { setForm({ title: '', username: '' }); setError(''); setShowAdd(true) }}>
            + Qo'shish
          </button>
        </div>
        {loading ? <div className="loading">Yuklanmoqda...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nomi</th>
                  <th>Username</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {channels.length === 0 && <tr><td colSpan={3} className="empty">Kanallar yo'q</td></tr>}
                {channels.map(ch => (
                  <tr key={ch.id}>
                    <td style={{ fontWeight: 600 }}>{ch.title}</td>
                    <td>
                      <a
                        href={`https://t.me/${(ch.username || ch.channel_id || '').replace('@','')}`}
                        target="_blank" rel="noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'none' }}
                      >@{(ch.username || ch.channel_id || '').replace('@','')}</a>
                    </td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => remove(ch.id)}>O'chirish</button></td>
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
            <div className="modal-title">📢 Kanal qo'shish</div>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Kanal nomi *</label>
                <input className="form-input" placeholder="Masalan: KinoKod Rasmiy" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Username * (@ belgisisiz)</label>
                <input className="form-input" placeholder="kinokod" value={form.username} onChange={e => setForm({ ...form, username: e.target.value.replace(/^@/, '') })} />
                {form.username && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Kanal: <a href={`https://t.me/${form.username}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>https://t.me/{form.username}</a>
                  </div>
                )}
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
