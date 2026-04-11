import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Movies() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ code: '', title: '', file_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('movies').select('*')
    if (err) console.error('Movies error:', err.message)
    const sorted = (data || []).sort((a, b) => Number(a.code) - Number(b.code))
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

      <div className="info-box">
        <b>📹 Video ID (file_id) qanday olish kerak?</b><br />
        1. Botga video yuborishdan oldin <code>/getid</code> yozing<br />
        2. Keyin kinoni <b>video sifatida</b> yuboring (fayl sifatida emas!)<br />
        3. Bot sizga <code>file_id</code> qaytaradi — shu kodni nusxalab oling<br />
        4. Quyida "+ Qo'shish" ni bosib, shu ID ni kiriting
        <button
          onClick={() => setShowGuide(!showGuide)}
          style={{ marginLeft: 10, background: 'none', border: '1px solid #1e3a5f', color: '#60a5fa', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}
        >
          {showGuide ? 'Yopish' : 'Batafsil ▼'}
        </button>
        {showGuide && (
          <div style={{ marginTop: 10, borderTop: '1px solid #1e3a5f', paddingTop: 10 }}>
            <b>Batafsil qo'llanma:</b><br />
            • Botingizga o'ting (masalan: @kinokodbot)<br />
            • <code>/getid</code> yuboring — bot tayyor holatga o'tadi<br />
            • Telegramda video faylni toping → <b>Forward</b> qiling yoki to'g'ridan yuborins<br />
            • Bot darhol file_id ni yuboradi<br />
            • Shu ID ni "+ Qo'shish" modali ichidagi "Telegram File ID" ga kiriting
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
            <button className="btn btn-primary btn-sm" onClick={() => { setForm({ code: '', title: '', file_id: '' }); setError(''); setShowAdd(true) }}>
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
                  <th>Video ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={4} className="empty">Kinolar topilmadi</td></tr>}
                {filtered.map(m => (
                  <tr key={m.code}>
                    <td><span className="badge badge-blue">{m.code}</span></td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</td>
                    <td style={{ color: m.file_id ? '#4ade80' : '#475569', fontSize: 12 }}>
                      {m.file_id ? '✅ Bor' : '—'}
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(m.code)}>O'chirish</button>
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
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Kod * <span style={{ color: '#475569', fontWeight: 400 }}>(foydalanuvchi shu kodni yuboradi)</span></label>
                <input
                  className="form-input"
                  placeholder="Masalan: 101"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Kino nomi *</label>
                <input
                  className="form-input"
                  placeholder="Masalan: Inception (2010)"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Telegram Video ID
                  <span style={{ color: '#475569', fontWeight: 400, marginLeft: 6 }}>(botdan /getid orqali oling)</span>
                </label>
                <input
                  className="form-input"
                  placeholder="BAACAgIAAxk..."
                  value={form.file_id}
                  onChange={e => setForm({ ...form, file_id: e.target.value })}
                />
                <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                  ⚠️ ID bo'lmasa foydalanuvchi video ololmaydi — yuqoridagi qo'llanmadan oling
                </div>
              </div>
              {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn" style={{ background: '#2d3148', color: '#94a3b8' }} onClick={() => setShowAdd(false)}>Bekor</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saqlanmoqda...' : '💾 Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
