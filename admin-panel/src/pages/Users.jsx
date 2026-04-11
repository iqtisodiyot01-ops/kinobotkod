import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase.from('users').select('*')
      if (err) {
        setError(err.message)
      } else {
        const sorted = (data || []).sort((a, b) => {
          return (b.telegram_id || b.user_id || 0) - (a.telegram_id || a.user_id || 0)
        })
        setUsers(sorted)
      }
      setLoading(false)
    }
    load()
  }, [])

  const getId = (u) => u.telegram_id || u.user_id || '—'
  const getLang = (u) => u.language || u.lang || '—'

  const filtered = users.filter(u => {
    const id = String(getId(u))
    const name = (u.full_name || '').toLowerCase()
    const uname = (u.username || '').toLowerCase()
    const s = search.toLowerCase()
    return id.includes(s) || name.includes(s) || uname.includes(s)
  })

  const langFlag = { uz: '🇺🇿', ru: '🇷🇺', en: '🇬🇧' }

  return (
    <div className="page">
      <div className="page-header">
        <h1>👥 Foydalanuvchilar</h1>
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Jami: {filtered.length} ta</span>
          <input
            className="form-input"
            style={{ width: 220 }}
            placeholder="ID, username yoki ism..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading">Yuklanmoqda...</div>
        ) : error ? (
          <div style={{ padding: 20, color: '#ef4444' }}>
            ❌ Xato: {error}<br />
            <small>Vercel'da <b>VITE_SUPABASE_KEY</b> ni <b>service_role</b> key bilan almashtiring</small>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Telegram ID</th>
                <th>Ism</th>
                <th>Username</th>
                <th>Til</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="empty">Foydalanuvchilar topilmadi</td></tr>
              )}
              {filtered.map(u => {
                const uid = getId(u)
                const lang = getLang(u)
                return (
                  <tr key={uid}>
                    <td><span className="badge badge-blue">{uid}</span></td>
                    <td>{u.full_name || '—'}</td>
                    <td style={{ color: '#64748b' }}>
                      {u.username
                        ? <a href={`https://t.me/${u.username}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>@{u.username}</a>
                        : '—'}
                    </td>
                    <td>{langFlag[lang] || '🌐'} {lang}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
