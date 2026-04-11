import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Support() {
  const [messages, setMessages] = useState([])
  const [globalNewCount, setGlobalNewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [tableError, setTableError] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchGlobalNew = async () => {
    const { count } = await supabase
      .from('support_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new')
    setGlobalNewCount(count || 0)
  }

  const fetchMessages = async () => {
    setLoading(true)
    setTableError(null)
    let query = supabase.from('support_messages').select('*')
    if (filter !== 'all') query = query.eq('status', filter)
    const { data, error } = await query
    if (error) {
      setTableError(error.message)
      setMessages([])
    } else {
      setMessages((data || []).sort((a, b) => b.id - a.id))
    }
    setLoading(false)
    fetchGlobalNew()
  }

  useEffect(() => { fetchMessages() }, [filter])

  const markRead = async (id) => {
    await supabase.from('support_messages').update({ status: 'read' }).eq('id', id)
    fetchMessages()
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    await supabase.from('support_messages').update({ status: 'read' }).eq('status', 'new')
    setMarkingAll(false)
    fetchMessages()
  }

  const deleteMsg = async (id) => {
    if (!confirm("Xabarni o'chirasizmi?")) return
    await supabase.from('support_messages').delete().eq('id', id)
    fetchMessages()
  }

  return (
    <>
      <div className="page-title">
        📨 Foydalanuvchi Xabarlari
        {globalNewCount > 0 && (
          <span style={{
            marginLeft: 10, background: '#ef4444', color: '#fff',
            borderRadius: 20, padding: '2px 10px', fontSize: 14, fontWeight: 600
          }}>{globalNewCount} yangi</span>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Filtr</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', 'new', 'read'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : ''}`}
                style={filter !== f ? { background: '#2d3148', color: '#94a3b8' } : {}}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Barchasi' : f === 'new' ? '🔴 Yangi' : "✅ O'qilgan"}
              </button>
            ))}
            {globalNewCount > 0 && (
              <button
                className="btn btn-sm"
                style={{ background: '#052e16', color: '#4ade80', border: '1px solid #166534' }}
                onClick={markAllRead}
                disabled={markingAll}
              >
                {markingAll ? '⏳...' : `✅ Barchasini o'qildi (${globalNewCount})`}
              </button>
            )}
            <button
              className="btn btn-sm"
              style={{ background: '#2d3148', color: '#94a3b8' }}
              onClick={fetchMessages}
            >🔄</button>
          </div>
        </div>
      </div>

      {tableError && (
        <div style={{
          background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 10,
          padding: 20, marginBottom: 20, color: '#fca5a5'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>❌ Jadval topilmadi!</div>
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
CREATE POLICY "allow_service_role" ON support_messages FOR ALL USING (true) WITH CHECK (true);`}</pre>
        </div>
      )}

      {loading ? (
        <div className="loading">Yuklanmoqda...</div>
      ) : !tableError && messages.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p>Xabarlar yo'q</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map(msg => (
            <div key={msg.id} className="card" style={{
              borderLeft: `4px solid ${msg.status === 'new' ? '#ef4444' : '#334155'}`,
              padding: 18
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      background: msg.status === 'new' ? '#450a0a' : '#1e2236',
                      color: msg.status === 'new' ? '#f87171' : '#64748b',
                      padding: '2px 10px', borderRadius: 20, fontSize: 12
                    }}>
                      {msg.status === 'new' ? '🔴 Yangi' : "✅ O'qilgan"}
                    </span>
                    {msg.first_name && <span style={{ fontWeight: 600, fontSize: 14 }}>{msg.first_name}</span>}
                    {msg.username && (
                      <a href={`https://t.me/${msg.username}`} target="_blank" rel="noreferrer"
                        style={{ color: '#60a5fa', fontSize: 13 }}>@{msg.username}</a>
                    )}
                    <span style={{ color: '#64748b', fontSize: 12 }}>#{msg.telegram_id || '—'}</span>
                    <span style={{ color: '#475569', fontSize: 11, marginLeft: 'auto' }}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    color: '#e2e8f0', wordBreak: 'break-word'
                  }}>
                    {msg.message}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  {msg.status === 'new' && (
                    <button className="btn btn-primary btn-sm" onClick={() => markRead(msg.id)}>
                      ✅ O'qildi
                    </button>
                  )}
                  {msg.username ? (
                    <a href={`https://t.me/${msg.username}`} target="_blank" rel="noreferrer"
                      className="btn btn-sm"
                      style={{ background: '#1a3a5c', color: '#60a5fa', textDecoration: 'none', textAlign: 'center' }}>
                      💬 Javob
                    </a>
                  ) : msg.telegram_id ? (
                    <a href={`tg://user?id=${msg.telegram_id}`}
                      className="btn btn-sm"
                      style={{ background: '#1a3a5c', color: '#60a5fa', textDecoration: 'none', textAlign: 'center' }}>
                      💬 Javob
                    </a>
                  ) : null}
                  <button
                    className="btn btn-sm"
                    style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d' }}
                    onClick={() => deleteMsg(msg.id)}
                  >🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
