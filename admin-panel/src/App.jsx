import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Movies from './pages/Movies'
import Channels from './pages/Channels'
import Users from './pages/Users'
import Broadcast from './pages/Broadcast'
import Payments from './pages/Payments'
import Support from './pages/Support'
import Sidebar from './components/Sidebar'

const pageTitles = {
  '/': 'Dashboard',
  '/movies': '🎬 Kinolar',
  '/channels': '📢 Kanallar',
  '/users': '👥 Foydalanuvchilar',
  '/broadcast': '📡 Broadcast',
  '/payments': "💳 To'lovlar",
  '/support': '📨 Xabarlar',
}

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const loc = useLocation()
  const title = pageTitles[loc.pathname] || 'KinoKod'

  return (
    <div className="layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="mobile-title">🎬 Kino<span>Kod</span></span>
          <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>{title}</span>
        </div>
        <main className="main">{children}</main>
      </div>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState(() => localStorage.getItem('kk_auth') === 'true')

  const login = (pass) => {
    const adminPass = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
    if (pass === adminPass) {
      localStorage.setItem('kk_auth', 'true')
      setAuth(true)
      return true
    }
    return false
  }

  if (!auth) return <Login onLogin={login} />

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/users" element={<Users />} />
          <Route path="/broadcast" element={<Broadcast />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/support" element={<Support />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
