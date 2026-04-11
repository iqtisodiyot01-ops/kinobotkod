import { useState } from 'react'

export default function Login({ onLogin }) {
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!onLogin(pass)) setError('Parol noto\'g\'ri!')
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-title">🎬 KinoKod Admin</div>
        <div className="login-sub">Admin paneliga kirish</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Parol</label>
            <input
              className="form-input"
              type="password"
              placeholder="Admin parolini kiriting"
              value={pass}
              onChange={e => { setPass(e.target.value); setError('') }}
              autoFocus
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', padding: '11px' }} type="submit">
            Kirish
          </button>
          {error && <div className="error-msg">{error}</div>}
        </form>
      </div>
    </div>
  )
}
