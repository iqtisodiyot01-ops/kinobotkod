import { useState, useEffect, useCallback } from 'react'
import { supabase, formatSupabaseError } from '../lib/supabase'

const emptyForm = { code: '', title: '', description: '', file_id: '', is_paid: false, price: '' }

// ─── MUHIM: Bu komponent Movies() TASHQARISIDA aniqlangan ─────────────────────
// Agar ichida aniqlansa, har keystroke'da yangi funksiya → DOM qayta yaratiladi
// → mobil klaviatura yopiladi. Bu eng keng tarqalgan React bug.
function MovieForm({ f, setF, onSubmit, onCancel, isSaving, err, isEdit }) {
  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Kod *</label>
          <input
            className="form-input"
            placeholder="101"
            value={f.code}
            onChange={e => setF(prev => ({ ...prev, code: e.target.value }))}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Kino nomi *</label>
          <input
            className="form-input"
            placeholder="Inception (2010)"
            value={f.title}
            onChange={e => setF(prev => ({ ...prev, title: e.target.value }))}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Tavsif (ixtiyoriy)</label>
        <textarea
          className="form-input"
          rows={3}
          placeholder="Kino haqida qisqacha..."
          value={f.description}
          onChange={e => setF(prev => ({ ...prev, description: e.target.value }))}
          style={{ resize: 'vertical' }}
        />
      </div>
      <div className="form-group">
        <label className="form-label">
          Telegram Video ID
          <span style={{ color: '#475569', fontWeight: 400, marginLeft: 6 }}>
            (botdan oling — BAACAgIA... kabi uzun string)
          </span>
        </label>
        <input
          className="form-input"
          placeholder="BAACAgIAAxkBAAIB..."
          value={f.file_id}
          onChange={e => setF(prev => ({ ...prev, file_id: e.target.value }))}
          autoComplete="off"
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
        {f.file_id && f.file_id.length < 20 && (
          <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 4 }}>
            ⚠️ file_id odatda 50+ belgi bo'ladi. To'liq nusxaladingizmi?
          </div>
        )}
        {f.file_id && f.file_id.length >= 20 && (
          <div style={{ fontSize: 11, color: '#4ade80', marginTop: 4 }}>
            ✅ {f.file_id.length} belgi — to'g'ri ko'rinadi
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 'none' }}>
          <label className="form-label">💎 Pulli kino</label>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: f.is_paid ? '#1a1a2e' : '#052e16',
              color: f.is_paid ? '#a78bfa' : '#4ade80',
              border: f.is_paid ? '1px solid #a78bfa' : '1px solid #166534',
            }}
            onClick={() => setF(prev => ({ ...prev, is_paid: !prev.is_paid }))}
          >
            {f.is_paid ? '💎 Ha' : '🆓 Bepul'}
          </button>
        </div>
        {f.is_paid && (
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Narxi (UZS) *</label>
            <input
              className="form-input"
              type="number"
              placeholder="50000"
              value={f.price}
              onChange={e => setF(prev => ({ ...prev, price: e.target.value }))}
              inputMode="numeric"
            />
          </div>
        )}
      </div>
      {err && (
        <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: '#3d1f1f', borderRadius: 8 }}>
          ❌ {err}
        </div>
      )}
      <div className="modal-actions">
        <button type="button" className="btn" style={{ background: '#2d3148', color: '#94a3b8' }} onClick={onCancel}>
          Bekor
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? '⏳ Saqlanmoqda...' : isEdit ? '✏️ Saqlash' : '💾 Qo\'shish'}
        </button>
      </div>
    </form>
  )
}

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

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('movies').select('*')
    if (err) console.error('Movies error:', err.message)
    setMovies((data || []).sort((a, b) => Number(a.code) - Number(b.code)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = movies.filter(m =>
    (m.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.title || '').toLowerCase().includes(search.toLowerCase())
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
    if (err) { setError(formatSupabaseError(err, 'movies')); return }
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
      if (err) { setEditError(formatSupabaseError(err, 'movies')); return }
    } else {
      const { error: insertErr } = await supabase.from('movies').insert(payload)
      if (insertErr) { setEditSaving(false); setEditError(formatSupabaseError(insertErr, 'movies')); return }
      await supabase.from('movies').delete().eq('code', oldCode)
      setEditSaving(false)
    }
    setEditMovie(null)
    load()
  }

  const remove = async (code, title) => {
    if (!confirm(`"${title}" (${code}) kinoni o'chirasizmi?`)) return
    const { error: err } = await supabase.from('movies').delete().eq('code', code)
    if (err) { alert('Xato: ' + err.message); return }
    load()
  }

  const sqlMigration = `-- Kinolar jadvaliga yangi ustunlar qo'shish (bir marta ishlatiladi):
ALTER TABLE movies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- file_id uzun bo'lishi uchun (Telegram file_id ~100 belgi):
-- Supabase TEXT tipida avtomatik cheksiz uzunlik, VARCHAR cheklov yo'q.`

  return (
    <>
      <div className="page-title">🎬 Kinolar</div>

      <div className="info-box">
        <b>📹 Video file_id qanday olish kerak?</b><br />
        Botga to'g'ridan video yuboring — bot darhol <code>file_id</code> qaytaradi.
        <button
          onClick={() => setShowGuide(!showGuide)}
          style={{ marginLeft: 10, background: 'none', border: '1px solid #1e3a5f', color: '#60a5fa', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}
        >
          {showGuide ? 'Yopish ▲' : 'Batafsil ▼'}
        </button>
        {showGuide && (
          <div style={{ marginTop: 10, borderTop: '1px solid #1e3a5f', paddingTop: 10 }}>
            <div style={{ marginBottom: 8 }}>
              <b>file_id haqida:</b> Telegram file_id ~50-100 belgilik uzun string (BAACAgIA... kabi).
              Uni nusxalashda <b>to'liq</b> nusxalang — qirqib qolmang.
            </div>
            <b>SQL (yangi ustunlar, bir marta):</b>
            <pre style={{ background: '#0a0a0a', padding: 10, borderRadius: 6, fontSize: 11, color: '#86efac', overflow: 'auto', marginTop: 6 }}>
              {sqlMigration}
            </pre>
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
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setForm(emptyForm); setError(''); setShowAdd(true) }}
            >
              + Qo'shish
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
                  <th>Kod</th>
                  <th>Nomi</th>
                  <th>Video ID</th>
                  <th>Narx</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="empty">Kinolar topilmadi</td></tr>
                )}
                {filtered.map(m => (
                  <tr key={m.code}>
                    <td><span className="badge badge-blue">{m.code}</span></td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title}
                    </td>
                    <td>
                      {m.file_id ? (
                        <span style={{ color: '#4ade80', fontSize: 12 }}>
                          ✅ <span style={{ fontFamily: 'monospace', color: '#64748b' }}>
                            {m.file_id.slice(0, 12)}...
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', fontSize: 12 }}>❌ Yo'q</span>
                      )}
                    </td>
                    <td>
                      {m.is_paid ? (
                        <span className="badge" style={{ background: '#1a1a2e', color: '#a78bfa' }}>
                          💎 {(m.price || 0).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: '#475569', fontSize: 12 }}>Bepul</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#1a3a5c', color: '#60a5fa' }}
                          onClick={() => openEdit(m)}
                        >✏️</button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => remove(m.code, m.title)}
                        >🗑️</button>
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
            <MovieForm
              f={form}
              setF={setForm}
              onSubmit={save}
              onCancel={() => setShowAdd(false)}
              isSaving={saving}
              err={error}
              isEdit={false}
            />
          </div>
        </div>
      )}

      {editMovie && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setEditMovie(null)}>
          <div className="modal">
            <div className="modal-title">✏️ Kinoni tahrirlash — {editMovie.title}</div>
            <MovieForm
              f={editForm}
              setF={setEditForm}
              onSubmit={saveEdit}
              onCancel={() => setEditMovie(null)}
              isSaving={editSaving}
              err={editError}
              isEdit={true}
            />
          </div>
        </div>
      )}
    </>
  )
}
