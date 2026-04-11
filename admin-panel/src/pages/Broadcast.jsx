import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Broadcast() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoFileId, setVideoFileId] = useState('')
  const [sending, setSending] = useState(false)
  const [botToken, setBotToken] = useState('')
  const [result, setResult] = useState(null)

  const loadHistory = async () => {
    setLoading(true)
    const { data } = await supabase.from('broadcasts').select('*').limit(20)
    setHistory((data || []).sort((a, b) => b.id - a.id))
    setLoading(false)
  }

  useEffect(() => {
    loadHistory()
    const saved = localStorage.getItem('kk_bot_token')
    if (saved) setBotToken(saved)
  }, [])

  const sendToUser = async (token, chatId, text, imageUrl, videoFileId) => {
    try {
      let res
      if (videoFileId.trim()) {
        res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            video: videoFileId.trim(),
            caption: text || undefined,
          }),
        })
      } else if (imageUrl.trim()) {
        res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: imageUrl.trim(),
            caption: text || undefined,
          }),
        })
      } else {
        res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
        })
      }
      const json = await res.json()
      return json.ok
    } catch {
      return false
    }
  }

  const startBroadcast = async () => {
    if (!text.trim() && !imageUrl.trim() && !videoFileId.trim()) return
    const token = botToken.trim() || import.meta.env.VITE_BOT_TOKEN || ''
    if (!token) { alert('Bot token kiriting!'); return }
    localStorage.setItem('kk_bot_token', token)
    setSending(true)
    setResult(null)

    const { data: users } = await supabase.from('users').select('*')
    const ids = (users || []).map(u => u.telegram_id || u.user_id).filter(Boolean)
    const total = ids.length

    const { data: bc } = await supabase.from('broadcasts').insert({
      message: text.trim() || '[Media]',
      sent_count: 0,
      status: 'sending',
    }).select().single()

    setResult({ status: 'sending', total, sent: 0, failed: 0 })

    let sent = 0, failed = 0
    for (let i = 0; i < ids.length; i++) {
      const ok = await sendToUser(token, ids[i], text.trim(), imageUrl, videoFileId)
      if (ok) sent++; else failed++
      if (i % 20 === 19) await new Promise(r => setTimeout(r, 1000))
      if (i % 50 === 49) setResult(r => ({ ...r, sent, failed }))
    }

    if (bc) {
      await supabase.from('broadcasts').update({ sent_count: sent, status: 'done' }).eq('id', bc.id)
    }
    setResult({ status: 'done', total, sent, failed })
    setSending(false)
    setText('')
    setImageUrl('')
    setVideoFileId('')
    loadHistory()
  }

  const mediaType = videoFileId.trim() ? 'video' : imageUrl.trim() ? 'image' : 'text'

  const statusBadge = (s) => {
    if (s === 'done') return <span className="badge badge-green">✅ Bajarildi</span>
    if (s === 'sending') return <span className="badge badge-blue">⏳ Yuborilmoqda</span>
    return <span className="badge">{s}</span>
  }

  return (
    <>
      <div className="page-title">Broadcast</div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><span className="card-title">Xabar yuborish</span></div>
        <div style={{ padding: 20 }}>
          <div className="form-group">
            <label className="form-label">Bot Token</label>
            <input className="form-input" type="password"
              placeholder="Bir marta kiriting — saqlab qolinadi"
              value={botToken} onChange={e => setBotToken(e.target.value)} />
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
              {botToken ? '✅ Token saqlangan' : '⚠️ Bot tokenini kiriting (bir marta)'}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Xabar matni {(imageUrl || videoFileId) ? '(caption, ixtiyoriy)' : '*'}</label>
            <textarea
              className="form-input"
              rows={5}
              placeholder="Barcha foydalanuvchilarga yuboriladigan xabar..."
              value={text}
              onChange={e => setText(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">🖼️ Rasm URL (ixtiyoriy)</label>
              <input
                className="form-input"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={e => { setImageUrl(e.target.value); if (e.target.value) setVideoFileId('') }}
                disabled={!!videoFileId}
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">🎬 Video File ID (ixtiyoriy)</label>
              <input
                className="form-input"
                placeholder="BAACAgIAAxk..."
                value={videoFileId}
                onChange={e => { setVideoFileId(e.target.value); if (e.target.value) setImageUrl('') }}
                disabled={!!imageUrl}
              />
            </div>
          </div>

          {(imageUrl || videoFileId || text) && (
            <div style={{
              background: '#1a2035', border: '1px solid #2d3148', borderRadius: 8,
              padding: 12, marginBottom: 16, fontSize: 13, color: '#94a3b8'
            }}>
              📤 Yuborish turi:{' '}
              <b style={{ color: '#e2e8f0' }}>
                {mediaType === 'video' ? '🎬 Video + ' + (text ? 'caption' : 'caption yo\'q') :
                  mediaType === 'image' ? '🖼️ Rasm + ' + (text ? 'caption' : 'caption yo\'q') :
                    '📝 Oddiy matn'}
              </b>
            </div>
          )}

          {result && (
            <div style={{
              background: '#14172099', border: '1px solid #2d3148',
              borderRadius: 8, padding: 16, marginBottom: 16
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                {result.status === 'done' ? '✅ Broadcast tugadi' : '⏳ Yuborilmoqda...'}
              </div>
              <div style={{ fontSize: 14, color: '#94a3b8' }}>
                Jami: {result.total} | ✅ {result.sent} | ❌ {result.failed}
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={startBroadcast}
            disabled={sending || (!text.trim() && !imageUrl.trim() && !videoFileId.trim()) || (!botToken.trim() && !import.meta.env.VITE_BOT_TOKEN)}
          >
            {sending ? '⏳ Yuborilmoqda...' : '📡 Yuborish'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Broadcast tarixi</span></div>
        {loading ? <div className="loading">Yuklanmoqda...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Xabar</th>
                  <th>Yuborildi</th>
                  <th>Holat</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && <tr><td colSpan={4} className="empty">Tarix yo'q</td></tr>}
                {history.map(b => (
                  <tr key={b.id}>
                    <td style={{ maxWidth: 300 }}>
                      {(b.message || '').slice(0, 60)}{(b.message || '').length > 60 ? '...' : ''}
                    </td>
                    <td>{b.sent_count}</td>
                    <td>{statusBadge(b.status)}</td>
                    <td style={{ color: '#64748b', fontSize: 12 }}>
                      {b.created_at ? new Date(b.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
