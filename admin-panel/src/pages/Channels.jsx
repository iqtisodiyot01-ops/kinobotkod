import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── ChannelForm Movies.jsx dagi kabi TASHQARIDA aniqlangan ───────────────────
function ChannelForm({ f, setF, onSubmit, onCancel, isSaving, err, isEdit, onCheck, checkResult, checking }) {
  return (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label className="form-label">Kanal nomi *</label>
        <input
          className="form-input"
          placeholder="Masalan: KinoKod Rasmiy"
          value={f.title}
          onChange={e => setF(prev => ({ ...prev, title: e.target.value }))}
          autoComplete="off"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Username * <span style={{ color: '#64748b', fontWeight: 400 }}>(@ belgisisiz)</span></label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            placeholder="kinokod"
            value={f.username}
            onChange={e => setF(prev => ({ ...prev, username: e.target.value.replace(/^@/, '') }))}
            autoComplete="off"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: '#0c2340', color: '#60a5fa', border: '1px solid #1d4ed8', whiteSpace: 'nowrap' }}
            onClick={onCheck}
            disabled={checking || !f.username.trim()}
          >
            {checking ? '⏳' : '🔍 Tekshir'}
          </button>
        </div>
        {f.username && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Kanal:{' '}
            <a href={`https://t.me/${f.username}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
              https://t.me/{f.username}
            </a>
          </div>
        )}
      </div>

      {checkResult && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          marginBottom: 14,
          background: checkResult.ok ? '#0a2e1a' : '#2e0a0a',
          border: `1px solid ${checkResult.ok ? '#166534' : '#7f1d1d'}`,
          fontSize: 13,
          color: checkResult.ok ? '#4ade80' : '#f87171',
          lineHeight: 1.6,
        }}>
          {checkResult.msg}
          {checkResult.ok && checkResult.chatId && (
            <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 12 }}>
              Chat ID: <code style={{ color: '#60a5fa' }}>{checkResult.chatId}</code>
            </div>
          )}
        </div>
      )}

      {!localStorage.getItem('kk_bot_token') && (
        <div style={{ padding: '8px 12px', background: '#2a1f00', border: '1px solid #92400e', borderRadius: 8, fontSize: 12, color: '#fbbf24', marginBottom: 14 }}>
          ⚠️ Bot tekshiruvi uchun avval <b>Broadcast</b> sahifasida bot tokenini kiriting.
        </div>
      )}

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
          {isSaving ? '⏳ Saqlanmoqda...' : isEdit ? '✏️ Saqlash' : '📢 Qo\'shish'}
        </button>
      </div>
    </form>
  )
}

export default function Channels() {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', username: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [checkResult, setCheckResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [editCh, setEditCh] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', username: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editCheckResult, setEditCheckResult] = useState(null)
  const [editChecking, setEditChecking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('channels').select('*')
    if (err) console.error('Channels error:', err.message)
    setChannels(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const checkBotAdmin = async (username, setCR, setChk) => {
    const token = localStorage.getItem('kk_bot_token')
    if (!token) {
      setCR({ ok: false, msg: '⚠️ Bot token kiritilmagan. Broadcast sahifasidan kiriting.' })
      return
    }
    const un = username.trim().replace(/^@/, '')
    if (!un) return
    setChk(true)
    try {
      const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=@${un}`)
      const chatJson = await chatRes.json()
      if (!chatJson.ok) {
        setCR({ ok: false, msg: `❌ Kanal topilmadi: ${chatJson.description}` })
        setChk(false); return
      }
      const chatId = chatJson.result.id
      const chatTitle = chatJson.result.title

      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
      const meJson = await meRes.json()
      const botId = meJson.result?.id

      if (!botId) { setCR({ ok: false, msg: '❌ Bot token noto\'g\'ri' }); setChk(false); return }

      const memberRes = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${chatId}&user_id=${botId}`)
      const memberJson = await memberRes.json()
      const status = memberJson.result?.status

      if (['administrator', 'creator'].includes(status)) {
        const canPost = memberJson.result?.can_post_messages
        setCR({
          ok: true,
          msg: `✅ Bot admin! "${chatTitle}"${!canPost ? ' (lekin xabar yuborish huquqi yo\'q — kanalda post huquqini bering)' : ''}`,
          chatId: String(chatId),
          chatTitle,
        })
      } else {
        setCR({
          ok: false,
          msg: `❌ Bot kanalda admin emas (holat: ${status || 'noma\'lum'}). Avval @${un} kanaliga botni admin qilib qo'shing va "Post yuborish" huquqini bering.`,
        })
      }
    } catch (e) {
      setCR({ ok: false, msg: `Tarmoq xatosi: ${e.message}` })
    }
    setChk(false)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.username.trim()) { setError('Nomi va username majburiy!'); return }
    const username = form.username.trim().replace(/^@/, '')

    // Check duplicate
    const exists = channels.find(c => (c.username || '').replace('@', '') === username)
    if (exists) { setError(`@${username} kanali allaqachon qo'shilgan!`); return }

    setSaving(true); setError('')
    const { error: err } = await supabase.from('channels').insert({
      channel_id: '@' + username,
      title: form.title.trim(),
      username,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowAdd(false)
    setForm({ title: '', username: '' })
    setCheckResult(null)
    load()
  }

  const openEdit = (ch) => {
    setEditCh(ch)
    setEditForm({
      title: ch.title || '',
      username: (ch.username || ch.channel_id || '').replace('@', ''),
    })
    setEditError('')
    setEditCheckResult(null)
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

  const remove = async (id, title) => {
    if (!confirm(`"${title}" kanalni o'chirasizmi?`)) return
    const { error: err } = await supabase.from('channels').delete().eq('id', id)
    if (err) { alert('Xato: ' + err.message); return }
    load()
  }

  return (
    <>
      <div className="page-title">📢 Kanallar</div>

      <div className="info-box">
        <b>⚠️ Kanal qo'shishdan oldin:</b> Bot kanalda admin bo'lishi shart!<br />
        1. Kanalingizni oching → Sozlamalar → Adminlar → Bot qo'shing<br />
        2. "Xabarlar yuborish" huquqini yoqing<br />
        3. Keyin "Tekshir" tugmasi bilan botning admin ekanini tasdiqlang
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Obuna kanallar ({channels.length})</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setForm({ title: '', username: '' }); setError(''); setCheckResult(null); setShowAdd(true) }}
          >
            + Qo'shish
          </button>
        </div>
        {loading ? (
          <div className="loading">Yuklanmoqda...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nomi</th>
                  <th>Username</th>
                  <th>Chat ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {channels.length === 0 && <tr><td colSpan={4} className="empty">Kanallar yo'q</td></tr>}
                {channels.map(ch => {
                  const un = (ch.username || ch.channel_id || '').replace('@', '')
                  return (
                    <tr key={ch.id}>
                      <td style={{ fontWeight: 600 }}>{ch.title}</td>
                      <td>
                        <a
                          href={`https://t.me/${un}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#60a5fa', textDecoration: 'none' }}
                        >
                          @{un}
                        </a>
                      </td>
                      <td>
                        {ch.chat_id ? (
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>{ch.chat_id}</span>
                        ) : (
                          <span style={{ color: '#475569', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#1a3a5c', color: '#60a5fa' }}
                            onClick={() => openEdit(ch)}
                          >✏️</button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => remove(ch.id, ch.title)}
                          >O'chirish</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">📢 Kanal qo'shish</div>
            <ChannelForm
              f={form}
              setF={setForm}
              onSubmit={save}
              onCancel={() => { setShowAdd(false); setCheckResult(null) }}
              isSaving={saving}
              err={error}
              isEdit={false}
              onCheck={() => checkBotAdmin(form.username, setCheckResult, setChecking)}
              checkResult={checkResult}
              checking={checking}
            />
          </div>
        </div>
      )}

      {editCh && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setEditCh(null)}>
          <div className="modal">
            <div className="modal-title">✏️ Kanalni tahrirlash</div>
            <ChannelForm
              f={editForm}
              setF={setEditForm}
              onSubmit={saveEdit}
              onCancel={() => { setEditCh(null); setEditCheckResult(null) }}
              isSaving={editSaving}
              err={editError}
              isEdit={true}
              onCheck={() => checkBotAdmin(editForm.username, setEditCheckResult, setEditChecking)}
              checkResult={editCheckResult}
              checking={editChecking}
            />
          </div>
        </div>
      )}
    </>
  )
}
