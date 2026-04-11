import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AD_TYPES = [
  { value: 'website', label: '🌐 Sayt', color: '#1a3a5c', text: '#60a5fa' },
  { value: 'telegram', label: '✈️ Telegram kanal', color: '#1a3a2a', text: '#4ade80' },
  { value: 'image', label: '🖼️ Rasm', color: '#2a1a3a', text: '#a78bfa' },
  { value: 'video', label: '🎬 Video', color: '#3a1a1a', text: '#f87171' },
]

const emptyForm = { type: 'website', title: '', url: '', caption: '', status: 'active' }

export default function Ads() {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = async () => {
    setLoading(true)
    setTableError(null)
    const { data, error } = await supabase.from('ads').select('*')
    if (error) {
      setTableError(error.message)
    } else {
      const sorted = (data || []).sort((a, b) => b.id - a.id)
      setAds(sorted)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = ads.filter(a => {
    if (filter === 'all') return true
    if (filter === 'active') return a.status === 'active'
    if (filter === 'inactive') return a.status === 'inactive'
    return a.type === filter
  })

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setFormError('Sarlavha majburiy!'); return }
    if ((form.type === 'website' || form.type === 'image' || form.type === 'video') && !form.url.trim()) {
      setFormError('URL majburiy!'); return
    }
    if (form.type === 'telegram' && !form.url.trim()) {
      setFormError('Kanal username majburiy (@username)!'); return
    }
    setSaving(true); setFormError('')
    const { error } = await supabase.from('ads').insert({
      type: form.type,
      title: form.title.trim(),
      url: form.url.trim() || null,
      caption: form.caption.trim() || null,
      status: form.status,
    })
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowAdd(false)
    setForm(emptyForm)
    load()
  }

  const toggleStatus = async (ad) => {
    const newStatus = ad.status === 'active' ? 'inactive' : 'active'
    await supabase.from('ads').update({ status: newStatus }).eq('id', ad.id)
    load()
  }

  const remove = async (id) => {
    if (!confirm("Reklamani o'chirasizmi?")) return
    await supabase.from('ads').delete().eq('id', id)
    load()
  }

  const typeInfo = (type) => AD_TYPES.find(t => t.value === type) || AD_TYPES[0]

  const urlLabel = () => {
    if (form.type === 'telegram') return 'Kanal username * (@username yoki kanal linki)'
    if (form.type === 'image') return 'Rasm URL * (https://...)'
    if (form.type === 'video') return 'Video URL * (https://...)'
    return 'Sayt URL * (https://...)'
  }

  const urlPlaceholder = () => {
    if (form.type === 'telegram') return '@kinokod yoki https://t.me/kinokod'
    if (form.type === 'image') return 'https://example.com/image.jpg'
    if (form.type === 'video') return 'https://example.com/video.mp4'
    return 'https://example.com'
  }

  return (
    <>
      <div className="page-title">📣 Reklama</div>

      {tableError && (
        <div style={{
          background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 10,
          padding: 20, marginBottom: 20, color: '#fca5a5'
        }}>
          <b>❌ Jadval topilmadi!</b> Supabase SQL Editorida quyidagini bajaring:
          <pre style={{
            background: '#0a0a0a', padding: 14, borderRadius: 8, marginTop: 10,
            fontSize: 12, color: '#86efac', overflow: 'auto', whiteSpace: 'pre-wrap'
          }}>{`CREATE TABLE IF NOT EXISTS ads (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'website',
  title TEXT NOT NULL,
  url TEXT,
  caption TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON ads FOR ALL USING (true) WITH CHECK (true);`}</pre>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'Barchasi' },
              { key: 'active', label: '✅ Faol' },
              { key: 'inactive', label: '⏸️ Nofaol' },
              { key: 'website', label: '🌐 Sayt' },
              { key: 'telegram', label: '✈️ Telegram' },
              { key: 'image', label: '🖼️ Rasm' },
              { key: 'video', label: '🎬 Video' },
            ].map(f => (
              <button
                key={f.key}
                className={`btn btn-sm ${filter === f.key ? 'btn-primary' : ''}`}
                style={filter !== f.key ? { background: '#2d3148', color: '#94a3b8' } : {}}
                onClick={() => setFilter(f.key)}
              >{f.label}</button>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setFormError(''); setShowAdd(true) }}>
            + Reklama qo'shish
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Yuklanmoqda...</div>
      ) : !tableError && filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📣</div>
          <p>Reklamalar yo'q</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>+ Reklama qo'shish tugmasini bosing</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(ad => {
            const ti = typeInfo(ad.type)
            return (
              <div key={ad.id} className="card" style={{
                borderLeft: `4px solid ${ad.status === 'active' ? '#22c55e' : '#475569'}`,
                padding: 18
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        background: ti.color, color: ti.text,
                        padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
                      }}>{ti.label}</span>
                      <span style={{
                        background: ad.status === 'active' ? '#052e16' : '#1c1c1c',
                        color: ad.status === 'active' ? '#4ade80' : '#64748b',
                        padding: '2px 10px', borderRadius: 20, fontSize: 12
                      }}>
                        {ad.status === 'active' ? '✅ Faol' : '⏸️ Nofaol'}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{ad.title}</div>
                    {ad.url && (
                      <div style={{ marginBottom: 6 }}>
                        {ad.type === 'website' || ad.type === 'telegram' ? (
                          <a
                            href={ad.url.startsWith('@') ? `https://t.me/${ad.url.replace('@', '')}` : ad.url}
                            target="_blank" rel="noreferrer"
                            style={{ color: '#60a5fa', fontSize: 13, wordBreak: 'break-all' }}
                          >{ad.url}</a>
                        ) : ad.type === 'image' ? (
                          <img
                            src={ad.url} alt={ad.title}
                            style={{ maxWidth: 200, maxHeight: 120, borderRadius: 8, objectFit: 'cover' }}
                            onError={e => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <a href={ad.url} target="_blank" rel="noreferrer"
                            style={{ color: '#f87171', fontSize: 13 }}
                          >🎬 {ad.url}</a>
                        )}
                      </div>
                    )}
                    {ad.caption && (
                      <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{ad.caption}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-sm"
                      style={{
                        background: ad.status === 'active' ? '#2d3148' : '#052e16',
                        color: ad.status === 'active' ? '#94a3b8' : '#4ade80'
                      }}
                      onClick={() => toggleStatus(ad)}
                    >
                      {ad.status === 'active' ? '⏸️ To\'xtat' : '▶️ Faollashtir'}
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d' }}
                      onClick={() => remove(ad.id)}
                    >🗑️ O'chirish</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">📣 Yangi reklama qo'shish</div>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Reklama turi *</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {AD_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      className="btn btn-sm"
                      style={{
                        background: form.type === t.value ? t.color : '#1e2236',
                        color: form.type === t.value ? t.text : '#64748b',
                        border: form.type === t.value ? `1px solid ${t.text}` : '1px solid #2d3148'
                      }}
                      onClick={() => setForm({ ...form, type: t.value })}
                    >{t.label}</button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Sarlavha *</label>
                <input
                  className="form-input"
                  placeholder="Masalan: KinoKod rasmiy kanali"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{urlLabel()}</label>
                <input
                  className="form-input"
                  placeholder={urlPlaceholder()}
                  value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tavsif / Caption (ixtiyoriy)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Qo'shimcha matn..."
                  value={form.caption}
                  onChange={e => setForm({ ...form, caption: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Holat</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['active', 'inactive'].map(s => (
                    <button
                      key={s}
                      type="button"
                      className="btn btn-sm"
                      style={{
                        background: form.status === s ? (s === 'active' ? '#052e16' : '#2d3148') : '#1e2236',
                        color: form.status === s ? (s === 'active' ? '#4ade80' : '#94a3b8') : '#475569',
                      }}
                      onClick={() => setForm({ ...form, status: s })}
                    >
                      {s === 'active' ? '✅ Faol' : '⏸️ Nofaol'}
                    </button>
                  ))}
                </div>
              </div>

              {formError && <div className="error-msg" style={{ marginBottom: 12 }}>{formError}</div>}

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
