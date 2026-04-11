import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Support() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [tableError, setTableError] = useState(null)

  const fetchMessages = async () => {
    setLoading(true)
    setTableError(null)
    let query = supabase.from('support_messages').select('*')
    if (filter !== 'all') {
      query = query.eq('status', filter)
    }
    const { data, error } = await query
    if (error) {
      console.error('Support fetch error:', error)
      setTableError(error.message)
      setMessages([])
    } else {
      const sorted = (data || []).sort((a, b) => b.id - a.id)
      setMessages(sorted)
    }
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
    <>
      <div className="page-title">
        📨 Foydalanuvchi Xabarlari
        {newCount > 0 && (
          <span style={{
            marginLeft: 10, background: '#ef4444', color: '#fff',
            borderRadius: 20, padding: '2px 10px', fontSize: 14, fontWeight: 600
          }}>{newCount} yangi</span>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Xabarlar filtri</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'new', 'read'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : ''}`}
                style={filter !== f ? { background: '#2d3148', color: '#94a3b8' } : {}}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Barchasi' : f === 'new' ? '🔴 Yangi' : '✅ O\'qilgan'}
              </button>
            ))}
            <button
              className="btn btn-sm"
              style={{ background: '#2d3148', color: '#94a3b8' }}
              onClick={fetchMessages}
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {tableError && (
        <div style={{
          background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 10,
          padding: 20, marginBottom: 20, color: '#fca5a5'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>❌ Jadval topilmadi!</div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>Xato: <code style={{ background: '#0f0f0f', padding: '2px 6px', borderRadius: 4 }}>{tableError}</code></div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
            Supabase → SQL Editor'da quyidagini bajaring:
          </div>
          <pre style={{
            background: '#0a0a0a', padding: 14, borderRadius: 8,
            fontSize: 12, color: '#86efac', overflow: 'auto', whiteSpace: 'pre-wrap'
          }}>{`CREATE TABLE IF NOT EXISTS support_messages (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT,
  username TEXT DEFAULT '',
  first_name TEXT DEFAULT '',
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_service_role" ON support_messages
  FOR ALL USING (true) WITH CHECK (true);`}</pre>
        </div>
      )}

      {loading ? (
        <div className="loading">Yuklanmoqda...</div>
      ) : !tableError && messages.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ marginBottom: 4 }}>Xabarlar yo'q</p>
          <p style={{ fontSize: 13 }}>
            Foydalanuvchi botda <b>"📨 Admin bilan bog'lanish"</b> tugmasini bosganda shu yerda ko'rinadi
          </p>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>
                      {msg.first_name || 'Nomsiz'}
                    </span>
                    {msg.username && (
                      <span style={{ color: '#60a5fa', fontSize: 13 }}>@{msg.username}</span>
                    )}
                    <span style={{
                      background: msg.status === 'new' ? '#450a0a' : '#052e16',
                      color: msg.status === 'new' ? '#fca5a5' : '#86efac',
                      border: `1px solid ${msg.status === 'new' ? '#7f1d1d' : '#14532d'}`,
                      borderRadius: 20, padding: '2px 10px', fontSize: 12
                    }}>
                      {msg.status === 'new' ? '🔴 Yangi' : '✅ O\'qilgan'}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>
                    🆔 {msg.telegram_id}
                    {msg.created_at && (
                      <> &nbsp;•&nbsp; 🕐 {new Date(msg.created_at).toLocaleString()}</>
                    )}
                  </div>
                  <div style={{
                    background: '#1e2236', borderRadius: 8, padding: '12px 16px',
                    fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#e2e8f0',
                    wordBreak: 'break-word'
                  }}>
                    {msg.message}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  {msg.status === 'new' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => markRead(msg.id)}
                    >
                      ✅ O'qildi
                    </button>
                  )}
                  {msg.username ? (
                    <a
                      href={`https://t.me/${msg.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm"
                      style={{ background: '#1a3a5c', color: '#60a5fa', textDecoration: 'none', textAlign: 'center' }}
                    >
                      💬 Javob
                    </a>
                  ) : msg.telegram_id ? (
                    <a
                      href={`tg://user?id=${msg.telegram_id}`}
                      className="btn btn-sm"
                      style={{ background: '#1a3a5c', color: '#60a5fa', textDecoration: 'none', textAlign: 'center' }}
                    >
                      💬 Javob
                    </a>
                  ) : null}
                  <button
                    className="btn btn-sm"
                    style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d' }}
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
    </>
  )
}
