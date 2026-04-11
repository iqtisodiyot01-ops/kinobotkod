import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Channels() {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', username: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editCh, setEditCh] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', username: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

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
    if (!form.title.trim() || !form.username.trim()) { setError('Nomi va username majburiy!'); return }
    setSaving(true); setError('')
    const username = form.username.trim().replace(/^@/, '')
    const { error: err } = await supabase.from('channels').insert({
      channel_id: '@' + username,
      title: form.title.trim(),
      username,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowAdd(false)
    setForm({ title: '', username: '' })
    load()
  }

  const openEdit = (ch) => {
    setEditCh(ch)
    setEditForm({
      title: ch.title || '',
      username: (ch.username || ch.channel_id || '').replace('@', ''),
    })
    setEditError('')
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editForm.title.trim() || !editForm.username.trim()) { setEditError('Nomi va username majburiy!'); return }
    setEditSaving(true); setEditError('')
    const username = editForm.username.trim().replace(/^@/, '')
    const { error: err } = await supabase.from('channels').update({
      channel_id: '@' + username,
      title: editForm.title.trim(),
      username,
    }).eq('id', editCh.id)
    setEditSaving(false)
    if (err) { setEditError(err.message); return }
    setEditCh(null)
    load()
  }

  const remove = async (id) => {
    if (!confirm("Kanalni o'chirasizmi?")) return
    await supabase.from('channels').delete().eq('id', id)
    load()
  }

  const ChannelForm = ({ f, setF, onSubmit, onCancel, isSaving, err, isEdit }) => (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label className="form-label">Kanal nomi *</label>
        <input className="form-input" placeholder="Masalan: KinoKod Rasmiy" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Username * (@ belgisisiz)</label>
        <input className="form-input" placeholder="kinokod" value={f.username} onChange={e => setF({ ...f, username: e.target.value.replace(/^@/, '') })} />
        {f.username && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Kanal: <a href={`https://t.me/${f.username}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>https://t.me/{f.username}</a>
          </div>
        )}
      </div>
      {err && <div className="error-msg" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="modal-actions">
        <button type="button" className="btn" style={{ background: '#2d3148', color: '#94a3b8' }} onClick={onCancel}>Bekor</button>
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? 'Saqlanmoqda...' : isEdit ? '✏️ Saqlash' : 'Qo\'shish'}
        </button>
      </div>
    </form>
  )

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
                        href={`https://t.me/${(ch.username || ch.channel_id || '').replace('@', '')}`}
                        target="_blank" rel="noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'none' }}
                      >@{(ch.username || ch.channel_id || '').replace('@', '')}</a>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" style={{ background: '#1a3a5c', color: '#60a5fa' }} onClick={() => openEdit(ch)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(ch.id)}>O'chirish</button>
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
            <div className="modal-title">📢 Kanal qo'shish</div>
            <ChannelForm f={form} setF={setForm} onSubmit={save} onCancel={() => setShowAdd(false)} isSaving={saving} err={error} isEdit={false} />
          </div>
        </div>
      )}

      {editCh && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setEditCh(null)}>
          <div className="modal">
            <div className="modal-title">✏️ Kanalni tahrirlash</div>
            <ChannelForm f={editForm} setF={setEditForm} onSubmit={saveEdit} onCancel={() => setEditCh(null)} isSaving={editSaving} err={editError} isEdit={true} />
          </div>
        </div>
      )}
    </>
  )
}
