import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({ movies: 0, users: 0, channels: 0, support: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [m, u, c, sm, rm] = await Promise.all([
          supabase.from('movies').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('channels').select('*', { count: 'exact', head: true }),
          supabase.from('support_messages').select('*', { count: 'exact', head: true }).eq('status', 'new'),
          supabase.from('movies').select('code, title'),
        ])
        if (m.error) throw new Error('Supabase: ' + m.error.message)
        setStats({
          movies: m.count || 0,
          users: u.count || 0,
          channels: c.count || 0,
          support: sm.count || 0,
        })
        setRecent((rm.data || []).slice(0, 5))
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
        <code style={{ fontSize: 12, background: '#0f0f0f', padding: '2px 6px', borderRadius: 4 }}>{error}</code>
        <br /><br />
        <b>Vercel'da tekshiring:</b><br />
        • <code>VITE_SUPABASE_URL</code> — Supabase project URL<br />
        • <code>VITE_SUPABASE_KEY</code> — <b>service_role</b> key (Settings → API → service_role)
      </div>
    </div>
  )

  return (
    <>
      <div className="page-title">Dashboard</div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Kinolar</div>
          <div className="value">🎬 {stats.movies}</div>
        </div>
        <div className="stat-card">
          <div className="label">Foydalanuvchilar</div>
          <div className="value">👥 {stats.users}</div>
        </div>
        <div className="stat-card">
          <div className="label">Kanallar</div>
          <div className="value">📢 {stats.channels}</div>
        </div>
        <div className="stat-card">
          <div className="label">Yangi xabarlar</div>
          <div className="value" style={{ color: stats.support > 0 ? '#f87171' : '#818cf8' }}>
            📨 {stats.support}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Kinolar (oxirgi 5)</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Kod</th><th>Nomi</th></tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr><td colSpan={2} className="empty">Kinolar yo'q — /movies sahifasidan qo'shing</td></tr>
              )}
              {recent.map(m => (
                <tr key={m.code}>
                  <td><span className="badge badge-blue">{m.code}</span></td>
                  <td>{m.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
