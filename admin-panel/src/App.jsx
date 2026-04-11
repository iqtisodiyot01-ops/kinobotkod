import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Movies from './pages/Movies'
import Channels from './pages/Channels'
import Users from './pages/Users'
import Sidebar from './components/Sidebar'

function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">{children}</main>
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

  const logout = () => {
    localStorage.removeItem('kk_auth')
    setAuth(false)
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
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
