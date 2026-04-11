import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Broadcast() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [botToken, setBotToken] = useState('')
  const [result, setResult] = useState(null)

  const loadHistory = async () => {
    setLoading(true)
    const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(20)
    setHistory(data || [])
    setLoading(false)
  }

  useEffect(() => { loadHistory() }, [])

  const startBroadcast = async () => {
    if (!text.trim()) return
    setSending(true)
    setResult(null)

    const { data: users } = await supabase.from('users').select('telegram_id')
    const ids = (users || []).map(u => u.telegram_id)
    const total = ids.length

    const { data: bc } = await supabase.from('broadcasts').insert({
      message: text.trim(),
      sent_count: 0,
      status: 'sending',
    }).select().single()

    setResult({ status: 'sending', total, sent: 0, failed: 0 })

    let sent = 0, failed = 0

    for (let i = 0; i < ids.length; i++) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: ids[i], text: text.trim() }),
        })
        const json = await res.json()
        if (json.ok) sent++
        else failed++
      } catch {
        failed++
      }
      if (i % 20 === 19) await new Promise(r => setTimeout(r, 1000))
      if (i % 50 === 49) setResult(r => ({ ...r, sent, failed }))
    }

    if (bc) {
      await supabase.from('broadcasts').update({ sent_count: sent, status: 'done' }).eq('id', bc.id)
    }
    setResult({ status: 'done', total, sent, failed })
    setSending(false)
    setText('')
    loadHistory()
  }

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
            <label className="form-label">Bot Token (telegram API uchun)</label>
            <input className="form-input" type="password" placeholder="BOT_TOKEN" value={botToken} onChange={e => setBotToken(e.target.value)} />
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Bot tokenini yozing — barcha foydalanuvchilarga Telegram API orqali yuboramiz</div>
          </div>
          <div className="form-group">
            <label className="form-label">Xabar matni *</label>
            <textarea
              className="form-input"
              rows={5}
              placeholder="Barcha foydalanuvchilarga yuboriladigan xabar..."
              value={text}
              onChange={e => setText(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {result && (
            <div style={{ background: '#14172099', border: '1px solid #2d3148', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                {result.status === 'done' ? '✅ Broadcast tugadi' : '⏳ Yuborilmoqda...'}
              </div>
              <div style={{ fontSize: 14, color: '#94a3b8' }}>
                Jami: {result.total} | ✅ {result.sent} | ❌ {result.failed}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={startBroadcast}
              disabled={sending || !text.trim() || !botToken.trim()}
            >
              {sending ? '⏳ Yuborilmoqda...' : '📡 Yuborish'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Broadcast tarixi</span></div>
        {loading ? <div className="loading">Yuklanmoqda...</div> : (
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
                  <td style={{ maxWidth: 300 }}>{b.message?.slice(0, 60)}{b.message?.length > 60 ? '...' : ''}</td>
                  <td>{b.sent_count}</td>
                  <td>{statusBadge(b.status)}</td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{b.created_at ? new Date(b.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
