import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

export default function Support() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetchMessages = async () => {
    setLoading(true)
    let query = supabase
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchMessages() }, [filter])

  const markRead = async (id) => {
    await supabase.from('support_messages').update({ status: 'read' }).eq('id', id)
    fetchMessages()
  }

  const deleteMsg = async (id) => {
    if (!confirm("Xabarni o'chirasizmi?")) return
    await supabase.from('support_messages').delete().eq('id', id)
    fetchMessages()
  }

  const newCount = messages.filter(m => m.status === 'new').length

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          📨 Foydalanuvchi Xabarlari
          {newCount > 0 && (
            <span style={{
              marginLeft: 10, background: '#ef4444', color: '#fff',
              borderRadius: 20, padding: '2px 10px', fontSize: 14
            }}>{newCount} yangi</span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'new', 'read'].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Barchasi' : f === 'new' ? '🔴 Yangi' : '✅ O\'qilgan'}
            </button>
          ))}
          <button className="btn btn-secondary" onClick={fetchMessages}>🔄</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Yuklanmoqda...</div>
      ) : messages.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48 }}>📭</div>
          <p>Xabarlar yo'q</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              className="card"
              style={{
                borderLeft: msg.status === 'new' ? '4px solid #ef4444' : '4px solid #22c55e',
                padding: 20
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>
                      {msg.first_name || 'Nomsiz'}
                    </span>
                    {msg.username && (
                      <span style={{ color: '#60a5fa', fontSize: 13 }}>@{msg.username}</span>
                    )}
                    <span style={{
                      background: msg.status === 'new' ? '#fef2f2' : '#f0fdf4',
                      color: msg.status === 'new' ? '#ef4444' : '#22c55e',
                      border: `1px solid ${msg.status === 'new' ? '#fecaca' : '#bbf7d0'}`,
                      borderRadius: 20, padding: '2px 10px', fontSize: 12
                    }}>
                      {msg.status === 'new' ? '🔴 Yangi' : '✅ O\'qilgan'}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>
                    🆔 {msg.telegram_id} &nbsp;•&nbsp; 🕐 {new Date(msg.created_at).toLocaleString('uz-UZ')}
                  </div>
                  <div style={{
                    background: '#f8fafc', borderRadius: 8, padding: '12px 16px',
                    fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap'
                  }}>
                    {msg.message}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 16, flexShrink: 0 }}>
                  {msg.status === 'new' && (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => markRead(msg.id)}
                    >
                      ✅ O'qildi
                    </button>
                  )}
                  <a
                    href={`https://t.me/${msg.username || msg.telegram_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}
                  >
                    💬 Javob
                  </a>
                  <button
                    className="btn"
                    style={{
                      fontSize: 12, padding: '6px 12px',
                      background: '#fef2f2', color: '#ef4444',
                      border: '1px solid #fecaca'
                    }}
                    onClick={() => deleteMsg(msg.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
