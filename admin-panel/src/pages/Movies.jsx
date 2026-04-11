import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Movies() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ code: '', title: '', file_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('movies').select('*')
    if (err) console.error('Movies error:', err.message)
    const sorted = (data || []).sort((a, b) => (b.code > a.code ? 1 : -1))
    setMovies(sorted)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = movies.filter(m =>
    m.code?.toLowerCase().includes(search.toLowerCase()) ||
    m.title?.toLowerCase().includes(search.toLowerCase())
  )

  const save = async (e) => {
    e.preventDefault()
    if (!form.code || !form.title) { setError('Kod va nom majburiy!'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('movies').upsert({
      code: form.code.trim(),
      title: form.title.trim(),
      file_id: form.file_id.trim() || null
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowAdd(false)
    setForm({ code: '', title: '', file_id: '' })
    load()
  }

  const remove = async (code) => {
    if (!confirm(`"${code}" kinoni o'chirasizmi?`)) return
    await supabase.from('movies').delete().eq('code', code)
    load()
  }

  return (
    <>
      <div className="page-title">Kinolar</div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Barcha kinolar ({filtered.length})</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="form-input"
              style={{ width: 200, padding: '7px 12px' }}
              placeholder="Qidirish..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Qo'shish</button>
          </div>
        </div>
        {loading ? <div className="loading">Yuklanmoqda...</div> : (
          <table>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Nomi</th>
                <th>File ID</th>
                <th>Sana</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5} className="empty">Kinolar topilmadi</td></tr>}
              {filtered.map(m => (
                <tr key={m.code}>
                  <td><span className="badge badge-blue">{m.code}</span></td>
                  <td>{m.title}</td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{m.file_id ? m.file_id.slice(0, 20) + '...' : '—'}</td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(m.code)}>O'chirish</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">Yangi kino qo'shish</div>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Kod *</label>
                <input className="form-input" placeholder="Masalan: 101" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Nomi *</label>
                <input className="form-input" placeholder="Kino nomi" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Telegram File ID (ixtiyoriy)</label>
                <input className="form-input" placeholder="BAACAgI..." value={form.file_id} onChange={e => setForm({ ...form, file_id: e.target.value })} />
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
