import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { code: '', title: '', description: '', file_id: '', is_paid: false, price: '' }

export default function Movies() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editMovie, setEditMovie] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('movies').select('*')
    if (err) console.error('Movies error:', err.message)
    setMovies((data || []).sort((a, b) => Number(a.code) - Number(b.code)))
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
      description: form.description.trim() || null,
      file_id: form.file_id.trim() || null,
      is_paid: form.is_paid,
      price: form.is_paid ? (parseInt(form.price) || 0) : 0,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowAdd(false)
    setForm(emptyForm)
    load()
  }

  const openEdit = (m) => {
    setEditMovie(m)
    setEditForm({
      code: m.code || '',
      title: m.title || '',
      description: m.description || '',
      file_id: m.file_id || '',
      is_paid: m.is_paid || false,
      price: m.price ? String(m.price) : '',
    })
    setEditError('')
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editForm.code || !editForm.title) { setEditError('Kod va nom majburiy!'); return }
    setEditSaving(true); setEditError('')
    const oldCode = editMovie.code
    const newCode = editForm.code.trim()
    const payload = {
      code: newCode,
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      file_id: editForm.file_id.trim() || null,
      is_paid: editForm.is_paid,
      price: editForm.is_paid ? (parseInt(editForm.price) || 0) : 0,
    }

    if (oldCode === newCode) {
      const { error: err } = await supabase.from('movies').update(payload).eq('code', oldCode)
      setEditSaving(false)
      if (err) { setEditError(err.message); return }
    } else {
      const { error: insertErr } = await supabase.from('movies').insert(payload)
      if (insertErr) { setEditSaving(false); setEditError(insertErr.message); return }
      await supabase.from('movies').delete().eq('code', oldCode)
      setEditSaving(false)
    }
    setEditMovie(null)
    load()
  }

  const remove = async (code) => {
    if (!confirm(`"${code}" kinoni o'chirasizmi?`)) return
    await supabase.from('movies').delete().eq('code', code)
    load()
  }

  const sqlMigration = `-- Kinolar jadvaliga yangi ustunlar qo'shish:
ALTER TABLE movies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`

  const MovieForm = ({ f, setF, onSubmit, onCancel, isSaving, err, isEdit }) => (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Kod *</label>
          <input className="form-input" placeholder="101" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Kino nomi *</label>
          <input className="form-input" placeholder="Inception (2010)" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Tavsif (ixtiyoriy)</label>
        <textarea className="form-input" rows={3} placeholder="Kino haqida qisqacha..." value={f.description} onChange={e => setF({ ...f, description: e.target.value })} style={{ resize: 'vertical' }} />
      </div>
      <div className="form-group">
        <label className="form-label">Telegram Video ID <span style={{ color: '#475569', fontWeight: 400 }}>(botdan oling)</span></label>
        <input className="form-input" placeholder="BAACAgIAAxk..." value={f.file_id} onChange={e => setF({ ...f, file_id: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 'none' }}>
          <label className="form-label">💎 Pulli kino</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-sm"
              style={{ background: f.is_paid ? '#1a1a2e' : '#052e16', color: f.is_paid ? '#a78bfa' : '#4ade80', border: f.is_paid ? '1px solid #a78bfa' : '1px solid #166534' }}
              onClick={() => setF({ ...f, is_paid: !f.is_paid })}>
              {f.is_paid ? '💎 Ha' : '🆓 Bepul'}
            </button>
          </div>
        </div>
        {f.is_paid && (
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Narxi (UZS) *</label>
            <input className="form-input" type="number" placeholder="50000" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} />
          </div>
        )}
      </div>
      {err && <div className="error-msg" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="modal-actions">
        <button type="button" className="btn" style={{ background: '#2d3148', color: '#94a3b8' }} onClick={onCancel}>Bekor</button>
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? 'Saqlanmoqda...' : isEdit ? '✏️ Saqlash' : '💾 Qo\'shish'}
        </button>
      </div>
    </form>
  )

  return (
    <>
      <div className="page-title">Kinolar</div>

      <div className="info-box">
        <b>📹 Video ID (file_id) qanday olish kerak?</b><br />
        Botga to'g'ridan video yuboring — bot darhol <code>file_id</code> qaytaradi
        <button
          onClick={() => setShowGuide(!showGuide)}
          style={{ marginLeft: 10, background: 'none', border: '1px solid #1e3a5f', color: '#60a5fa', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}
        >{showGuide ? 'Yopish' : 'Batafsil ▼'}</button>
        {showGuide && (
          <div style={{ marginTop: 10, borderTop: '1px solid #1e3a5f', paddingTop: 10 }}>
            <b>SQL (yangi ustunlar):</b>
            <pre style={{ background: '#0a0a0a', padding: 10, borderRadius: 6, fontSize: 11, color: '#86efac', overflow: 'auto', marginTop: 6 }}>{sqlMigration}</pre>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Barcha kinolar ({filtered.length})</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="form-input"
              style={{ width: 160, padding: '7px 12px' }}
              placeholder="Qidirish..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setError(''); setShowAdd(true) }}>
              + Qo'shish
            </button>
          </div>
        </div>
        {loading ? <div className="loading">Yuklanmoqda...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Nomi</th>
                  <th>Video</th>
                  <th>Narx</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={5} className="empty">Kinolar topilmadi</td></tr>}
                {filtered.map(m => (
                  <tr key={m.code}>
                    <td><span className="badge badge-blue">{m.code}</span></td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</td>
                    <td style={{ color: m.file_id ? '#4ade80' : '#475569', fontSize: 12 }}>
                      {m.file_id ? '✅' : '—'}
                    </td>
                    <td>
                      {m.is_paid
                        ? <span className="badge" style={{ background: '#1a1a2e', color: '#a78bfa' }}>💎 {(m.price || 0).toLocaleString()}</span>
                        : <span style={{ color: '#475569', fontSize: 12 }}>Bepul</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" style={{ background: '#1a3a5c', color: '#60a5fa' }} onClick={() => openEdit(m)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(m.code)}>🗑️</button>
                      </div>
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
            <div className="modal-title">🎬 Yangi kino qo'shish</div>
            <MovieForm f={form} setF={setForm} onSubmit={save} onCancel={() => setShowAdd(false)} isSaving={saving} err={error} isEdit={false} />
          </div>
        </div>
      )}

      {editMovie && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setEditMovie(null)}>
          <div className="modal">
            <div className="modal-title">✏️ Kinoni tahrirlash</div>
            <MovieForm f={editForm} setF={setEditForm} onSubmit={saveEdit} onCancel={() => setEditMovie(null)} isSaving={editSaving} err={editError} isEdit={true} />
          </div>
        </div>
      )}
    </>
  )
}
