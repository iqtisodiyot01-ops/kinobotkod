import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({
    movies: 0, users: 0, channels: 0, support: 0,
    premium: 0, todayUsers: 0, todayMovies: 0,
    paidMovies: 0,
  })
  const [recent, setRecent] = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayISO = today.toISOString()

        const [m, u, c, sm, rm, prem, tUsers, tMovies, pMovies, bcast] = await Promise.all([
          supabase.from('movies').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('channels').select('*', { count: 'exact', head: true }),
          supabase.from('support_messages').select('*', { count: 'exact', head: true }).eq('status', 'new'),
          supabase.from('movies').select('code, title, is_paid, price').limit(10),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_premium', true),
          supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
          supabase.from('movies').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
          supabase.from('movies').select('*', { count: 'exact', head: true }).eq('is_paid', true),
          supabase.from('broadcasts').select('id,message,sent_count,status,created_at').limit(5),
        ])

        if (m.error) throw new Error('Supabase: ' + m.error.message)

        setStats({
          movies: m.count || 0,
          users: u.count || 0,
          channels: c.count || 0,
          support: sm.count || 0,
          premium: prem.count || 0,
          todayUsers: tUsers.count || 0,
          todayMovies: tMovies.count || 0,
          paidMovies: pMovies.count || 0,
        })
        setRecent((rm.data || []).slice(0, 8))
        setBroadcasts((bcast.data || []).sort((a, b) => b.id - a.id).slice(0, 5))
      } catch (e) {
        setError(e.message)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading">Yuklanmoqda...</div>

  if (error) return (
    <div>
      <div className="page-title">Dashboard</div>
      <div style={{
        background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 10,
        padding: 20, color: '#fca5a5', lineHeight: 1.8
      }}>
        <b>❌ Supabase ulanish xatosi:</b><br />
        <code style={{ fontSize: 12 }}>{error}</code>
      </div>
    </div>
  )

  const StatCard = ({ icon, label, value, sub, color }) => (
    <div className="stat-card" style={color ? { borderTop: `3px solid ${color}` } : {}}>
      <div className="label">{label}</div>
      <div className="value" style={color ? { color } : {}}>{icon} {value}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  )

  return (
    <>
      <div className="page-title">Dashboard</div>

      <div style={{ marginBottom: 8, color: '#64748b', fontSize: 13 }}>
        📅 Bugun: {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>

      <div style={{ marginBottom: 8, fontWeight: 600, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        JAMI STATISTIKA
      </div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard icon="🎬" label="Kinolar" value={stats.movies} sub={`${stats.paidMovies} pulli`} />
        <StatCard icon="👥" label="Foydalanuvchilar" value={stats.users} sub={`${stats.premium} premium`} color="#818cf8" />
        <StatCard icon="📢" label="Kanallar" value={stats.channels} />
        <StatCard icon="📨" label="Yangi xabarlar" value={stats.support} color={stats.support > 0 ? '#f87171' : undefined} />
      </div>

      <div style={{ marginBottom: 8, fontWeight: 600, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        BUGUNGI KUN
      </div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard icon="🆕" label="Bugun qo'shilgan" value={stats.todayUsers} sub="foydalanuvchi" color="#22c55e" />
        <StatCard icon="🎞️" label="Bugun qo'shilgan" value={stats.todayMovies} sub="kino" color="#60a5fa" />
        <StatCard icon="💎" label="Premium" value={stats.premium} sub={`${stats.users ? Math.round(stats.premium / stats.users * 100) : 0}% foydalanuvchi`} color="#f59e0b" />
        <StatCard icon="💳" label="Pulli kinolar" value={stats.paidMovies} color="#a78bfa" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Kinolar (so'nggi)</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Kod</th><th>Nomi</th><th>Holat</th></tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr><td colSpan={3} className="empty">Kinolar yo'q</td></tr>
                )}
                {recent.map(m => (
                  <tr key={m.code}>
                    <td><span className="badge badge-blue">{m.code}</span></td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</td>
                    <td>
                      {m.is_paid
                        ? <span className="badge" style={{ background: '#1a1a2e', color: '#a78bfa' }}>💎 {(m.price || 0).toLocaleString()}</span>
                        : <span className="badge" style={{ background: '#1a2e1a', color: '#4ade80' }}>🆓 Bepul</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">So'nggi broadcastlar</span>
          </div>
          {broadcasts.length === 0 ? (
            <div style={{ padding: 20, color: '#64748b', textAlign: 'center' }}>Broadcast yo'q</div>
          ) : (
            <div style={{ padding: '0 0 8px' }}>
              {broadcasts.map(b => (
                <div key={b.id} style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid #1e2236',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(b.message || '').slice(0, 50)}{(b.message || '').length > 50 ? '...' : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      ✅ {b.sent_count} yuborildi · {b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <span style={{
                    background: b.status === 'done' ? '#052e16' : '#1a1a2e',
                    color: b.status === 'done' ? '#4ade80' : '#94a3b8',
                    padding: '2px 8px', borderRadius: 20, fontSize: 11, flexShrink: 0
                  }}>
                    {b.status === 'done' ? '✅' : '⏳'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
