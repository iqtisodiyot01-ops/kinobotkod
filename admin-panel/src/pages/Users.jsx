import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = users.filter(u =>
    String(u.user_id).includes(search) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const langFlag = { uz: '🇺🇿', ru: '🇷🇺', en: '🇬🇧' }

  return (
    <>
      <div className="page-title">Foydalanuvchilar</div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Barcha foydalanuvchilar ({filtered.length})</span>
          <input
            className="form-input"
            style={{ width: 220, padding: '7px 12px' }}
            placeholder="ID, username yoki ism..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {loading ? <div className="loading">Yuklanmoqda...</div> : (
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Ism</th>
                <th>Username</th>
                <th>Til</th>
                <th>Ro'yxatdan o'tgan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5} className="empty">Foydalanuvchilar topilmadi</td></tr>}
              {filtered.map(u => (
                <tr key={u.user_id}>
                  <td><span className="badge badge-blue">{u.user_id}</span></td>
                  <td>{u.full_name || '—'}</td>
                  <td style={{ color: '#64748b' }}>{u.username ? `@${u.username}` : '—'}</td>
                  <td>{langFlag[u.language] || '🌐'} {u.language || '—'}</td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('uz-UZ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
