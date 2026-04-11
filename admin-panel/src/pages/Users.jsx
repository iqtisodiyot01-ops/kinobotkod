import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPremium, setFilterPremium] = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase.from('users').select('*')
      if (err) {
        setError(err.message)
      } else {
        setUsers((data || []).sort((a, b) => (b.telegram_id || b.user_id || 0) - (a.telegram_id || a.user_id || 0)))
      }
      setLoading(false)
    }
    load()
  }, [])

  const getId = (u) => u.telegram_id || u.user_id || '—'
  const getLang = (u) => u.language || u.lang || '—'
  const getName = (u) => u.full_name || u.first_name || null
  const langFlag = { uz: '🇺🇿', ru: '🇷🇺', en: '🇬🇧' }

  const filtered = users.filter(u => {
    const id = String(getId(u))
    const name = (getName(u) || '').toLowerCase()
    const uname = (u.username || '').toLowerCase()
    const s = search.toLowerCase()
    const matchSearch = !s || id.includes(s) || name.includes(s) || uname.includes(s)
    const matchPremium = filterPremium === 'all' || (filterPremium === 'premium' ? u.is_premium : !u.is_premium)
    return matchSearch && matchPremium
  })

  const premiumCount = users.filter(u => u.is_premium).length

  return (
    <>
      <div className="page-title">
        👥 Foydalanuvchilar
        <span style={{ marginLeft: 10, background: '#1a1a2e', color: '#a78bfa', borderRadius: 20, padding: '2px 10px', fontSize: 14 }}>
          💎 {premiumCount} premium
        </span>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Jami: {filtered.length} / {users.length} ta</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="form-input"
              style={{ width: 180, padding: '7px 12px' }}
              placeholder="ID, username yoki ism..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {['all', 'premium', 'free'].map(f => (
              <button key={f}
                className={`btn btn-sm ${filterPremium === f ? 'btn-primary' : ''}`}
                style={filterPremium !== f ? { background: '#2d3148', color: '#94a3b8' } : {}}
                onClick={() => setFilterPremium(f)}
              >
                {f === 'all' ? 'Barchasi' : f === 'premium' ? '💎 Premium' : '🆓 Oddiy'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading">Yuklanmoqda...</div>
        ) : error ? (
          <div style={{ padding: 20, color: '#fca5a5', lineHeight: 1.8 }}>
            ❌ Xato: <code style={{ fontSize: 12 }}>{error}</code><br />
            <small style={{ color: '#94a3b8' }}>Vercel → <b>VITE_SUPABASE_KEY</b> = service_role key bo'lishi kerak</small>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Telegram ID</th>
                  <th>Ism</th>
                  <th>Username</th>
                  <th>Til</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="empty">Foydalanuvchilar topilmadi</td></tr>
                )}
                {filtered.map(u => {
                  const uid = getId(u)
                  const lang = getLang(u)
                  const name = getName(u)
                  return (
                    <tr key={uid}>
                      <td><span className="badge badge-blue">{uid}</span></td>
                      <td style={{ fontWeight: name ? 500 : 400, color: name ? '#e2e8f0' : '#475569' }}>
                        {name || <span style={{ color: '#475569', fontSize: 12 }}>Noma'lum</span>}
                      </td>
                      <td>
                        {u.username
                          ? <a href={`https://t.me/${u.username}`} target="_blank" rel="noreferrer"
                            style={{ color: '#60a5fa' }}>@{u.username}</a>
                          : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}
                      </td>
                      <td>{langFlag[lang] || '🌐'} {lang}</td>
                      <td>
                        {u.is_premium
                          ? <span className="badge" style={{ background: '#1a1a2e', color: '#a78bfa' }}>💎 Premium</span>
                          : <span style={{ color: '#475569', fontSize: 12 }}>Oddiy</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
