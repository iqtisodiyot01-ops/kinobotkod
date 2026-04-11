import { useNavigate, useLocation } from 'react-router-dom'

const items = [
  { icon: '📊', label: 'Dashboard', path: '/' },
  { icon: '🎬', label: 'Kinolar', path: '/movies' },
  { icon: '📢', label: 'Kanallar', path: '/channels' },
  { icon: '👥', label: 'Foydalanuvchilar', path: '/users' },
  { icon: '📡', label: 'Broadcast', path: '/broadcast' },
  { icon: '💳', label: "To'lovlar", path: '/payments' },
  { icon: '📨', label: 'Xabarlar', path: '/support' },
  { icon: '📣', label: 'Reklama', path: '/ads' },
]

export default function Sidebar({ open, onClose }) {
  const nav = useNavigate()
  const loc = useLocation()

  const logout = () => {
    localStorage.removeItem('kk_auth')
    window.location.reload()
  }

  const go = (path) => {
    nav(path)
    onClose?.()
  }

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <span>🎬 Kino<span>Kod</span></span>
          <button className="sidebar-close" onClick={onClose}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {items.map(item => (
            <div
              key={item.path}
              className={`nav-item ${loc.pathname === item.path ? 'active' : ''}`}
              onClick={() => go(item.path)}
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
    </>
  )
}
