import { useNavigate, useLocation } from 'react-router-dom'

const items = [
  { icon: '📊', label: 'Dashboard', path: '/' },
  { icon: '🎬', label: 'Kinolar', path: '/movies' },
  { icon: '📢', label: 'Kanallar', path: '/channels' },
  { icon: '👥', label: 'Foydalanuvchilar', path: '/users' },
  { icon: '📡', label: 'Broadcast', path: '/broadcast' },
  { icon: '💳', label: "To'lovlar", path: '/payments' },
  { icon: '📨', label: 'Xabarlar', path: '/support' },
]

export default function Sidebar() {
  const nav = useNavigate()
  const loc = useLocation()

  const logout = () => {
    localStorage.removeItem('kk_auth')
    window.location.reload()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">🎬 Kino<span>Kod</span></div>
      <nav className="sidebar-nav">
        {items.map(item => (
          <div
            key={item.path}
            className={`nav-item ${loc.pathname === item.path ? 'active' : ''}`}
            onClick={() => nav(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>🚪 Chiqish</button>
      </div>
    </aside>
  )
}
