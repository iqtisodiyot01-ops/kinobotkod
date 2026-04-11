import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({ movies: 0, users: 0, channels: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [m, u, c, r] = await Promise.all([
        supabase.from('movies').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('channels').select('*', { count: 'exact', head: true }),
        supabase.from('movies').select('code, title, created_at').order('created_at', { ascending: false }).limit(5)
      ])
      setStats({ movies: m.count || 0, users: u.count || 0, channels: c.count || 0 })
      setRecent(r.data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading">Yuklanmoqda...</div>

  return (
    <>
      <div className="page-title">Dashboard</div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Jami kinolar</div>
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
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Oxirgi qo'shilgan kinolar</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Kod</th>
              <th>Nomi</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={3} className="empty">Kinolar yo'q</td></tr>
            )}
            {recent.map(m => (
              <tr key={m.code}>
                <td><span className="badge badge-blue">{m.code}</span></td>
                <td>{m.title}</td>
                <td style={{ color: '#64748b', fontSize: 12 }}>
                  {m.created_at ? new Date(m.created_at).toLocaleDateString('uz-UZ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
