import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || ''
const MOVIE_CHANNEL = import.meta.env.VITE_MOVIE_CHANNEL || '@kinokod'

async function sendBotMessage(uid, text) {
  const token = localStorage.getItem('kk_bot_token')
  if (!token || !uid) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: uid, text, parse_mode: 'HTML' }),
    })
  } catch (e) {
    console.warn('Telegram notify failed:', e)
  }
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Hozirgina'
  if (mins < 60) return `${mins} daqiqa oldin`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} soat oldin`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} kun oldin`
  return formatDate(iso)
}

const SQL_MIGRATION = `-- Foydalanuvchi ismi va username saqlash uchun ustunlar:
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lang TEXT DEFAULT 'uz';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Bot middleware (handlers/middlewares/user.py) bu fieldlarni avtomatik saqlaydi.
-- Eski foydalanuvchilar uchun: keyingi xabar yuborilganda ma'lumot yangilanadi.`

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSqlGuide, setShowSqlGuide] = useState(false)
  const [search, setSearch] = useState('')
  const [filterPremium, setFilterPremium] = useState('all')
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [creditInput, setCreditInput] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.from('users').select('*')
    if (err) setError(err.message)
    else setUsers((data || []).sort((a, b) => {
      // Eng so'nggisi birinchi
      const dateA = a.last_seen || a.created_at || 0
      const dateB = b.last_seen || b.created_at || 0
      return new Date(dateB) - new Date(dateA)
    }))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getId = (u) => u.telegram_id || u.user_id || '—'
  const getLang = (u) => u.language || u.lang || '—'
  const getName = (u) => {
    if (u.full_name) return u.full_name
    if (u.first_name) return [u.first_name, u.last_name].filter(Boolean).join(' ')
    return null
  }
  const langFlag = { uz: '🇺🇿', ru: '🇷🇺', en: '🇬🇧' }

  const filtered = users.filter(u => {
    const id = String(getId(u))
    const name = (getName(u) || '').toLowerCase()
    const uname = (u.username || '').toLowerCase()
    const s = search.toLowerCase()
    const matchSearch = !s || id.includes(s) || name.includes(s) || uname.includes(s)
    const matchPremium = filterPremium === 'all' ||
      (filterPremium === 'premium' ? u.is_premium : !u.is_premium)
    return matchSearch && matchPremium
  })

  const premiumCount = users.filter(u => u.is_premium).length
  const noNameCount = users.filter(u => !getName(u)).length

  function openModal(u) {
    setSelected({ ...u })
    setCreditInput('')
    setCopied(false)
  }

  function closeModal() {
    setSelected(null)
    setCreditInput('')
  }

  async function savePremium(isPremium) {
    if (!selected) return
    setSaving(true)
    const idCol = selected.telegram_id ? 'telegram_id' : 'user_id'
    const uid = selected.telegram_id || selected.user_id
    await supabase.from('users').update({ is_premium: isPremium }).eq(idCol, uid)
    setSelected(prev => ({ ...prev, is_premium: isPremium }))
    setUsers(prev => prev.map(u =>
      (u.telegram_id || u.user_id) === uid ? { ...u, is_premium: isPremium } : u
    ))
    if (isPremium) {
      const name = getName(selected) || selected.username || 'Foydalanuvchi'
      await sendBotMessage(uid,
        `🎉 <b>Tabriklaymiz, ${name}!</b>\n\n` +
        `💎 Sizga <b>PREMIUM</b> berildi!\n\n` +
        `Endi barcha pulli va bepul kinolarni erkin ko'rishingiz mumkin 🎬\n` +
        `Kino kodini yuboring yoki kanalimizdan tanlab ko'ring:\n${MOVIE_CHANNEL}`
      )
    }
    setSaving(false)
  }

  async function addCredits() {
    const amount = parseInt(creditInput)
    if (!amount || amount <= 0 || !selected) return
    setSaving(true)
    const idCol = selected.telegram_id ? 'telegram_id' : 'user_id'
    const uid = selected.telegram_id || selected.user_id
    const current = selected.credits || 0
    const newCredits = current + amount
    await supabase.from('users').update({ credits: newCredits }).eq(idCol, uid)
    setSelected(prev => ({ ...prev, credits: newCredits }))
    setUsers(prev => prev.map(u =>
      (u.telegram_id || u.user_id) === uid ? { ...u, credits: newCredits } : u
    ))
    setCreditInput('')
    setSaving(false)
  }

  async function removeCredits() {
    if (!selected) return
    setSaving(true)
    const idCol = selected.telegram_id ? 'telegram_id' : 'user_id'
    const uid = selected.telegram_id || selected.user_id
    await supabase.from('users').update({ credits: 0 }).eq(idCol, uid)
    setSelected(prev => ({ ...prev, credits: 0 }))
    setUsers(prev => prev.map(u =>
      (u.telegram_id || u.user_id) === uid ? { ...u, credits: 0 } : u
    ))
    setSaving(false)
  }

  function refLink(uid) {
    if (BOT_USERNAME) return `https://t.me/${BOT_USERNAME}?start=ref_${uid}`
    return `https://t.me/YourBot?start=ref_${uid}`
  }

  function copyLink(uid) {
    navigator.clipboard.writeText(refLink(uid)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <div className="page-title">
        👥 Foydalanuvchilar
        <span style={{ marginLeft: 10, background: '#1a1a2e', color: '#a78bfa', borderRadius: 20, padding: '2px 10px', fontSize: 14 }}>
          💎 {premiumCount} premium
        </span>
      </div>

      {noNameCount > 0 && (
        <div className="info-box">
          <b>ℹ️ {noNameCount} ta foydalanuvchida ism yo'q.</b>{' '}
          Bu foydalanuvchilar bot yangilanishidan oldin qo'shilgan. Yangi versiyada middleware avtomatik saqlaydi.
          <button
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            style={{ marginLeft: 8, background: 'none', border: '1px solid #1e3a5f', color: '#60a5fa', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}
          >
            {showSqlGuide ? 'SQL yopish ▲' : 'SQL migratsiya ▼'}
          </button>
          {showSqlGuide && (
            <pre style={{ background: '#0a0a0a', padding: 10, borderRadius: 6, fontSize: 11, color: '#86efac', overflow: 'auto', marginTop: 8 }}>
              {SQL_MIGRATION}
            </pre>
          )}
        </div>
      )}

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
              <button
                key={f}
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
                  <th>Oxirgi faollik</th>
                  <th>Kredit</th>
                  <th>Holat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="empty">Foydalanuvchilar topilmadi</td></tr>
                )}
                {filtered.map(u => {
                  const uid = getId(u)
                  const lang = getLang(u)
                  const name = getName(u)
                  const credits = u.credits || 0
                  const lastSeen = u.last_seen || u.updated_at || u.created_at || null
                  return (
                    <tr key={uid}>
                      <td><span className="badge badge-blue">{uid}</span></td>
                      <td style={{ fontWeight: name ? 500 : 400, color: name ? '#e2e8f0' : '#475569' }}>
                        {name || <span style={{ color: '#475569', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {u.username ? (
                          <a
                            href={`https://t.me/${u.username}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#60a5fa' }}
                          >@{u.username}</a>
                        ) : (
                          <span style={{ color: '#475569', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>{langFlag[lang] || '🌐'} {lang}</td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {timeAgo(lastSeen)}
                      </td>
                      <td>
                        {credits > 0 ? (
                          <span className="badge" style={{ background: '#1c3151', color: '#60a5fa' }}>🎟 {credits}</span>
                        ) : (
                          <span style={{ color: '#475569', fontSize: 12 }}>0</span>
                        )}
                      </td>
                      <td>
                        {u.is_premium ? (
                          <span className="badge" style={{ background: '#1a1a2e', color: '#a78bfa' }}>💎 Premium</span>
                        ) : (
                          <span style={{ color: '#475569', fontSize: 12 }}>Oddiy</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#1a1a2e', color: '#a78bfa', border: '1px solid #4c1d95', padding: '4px 10px' }}
                          onClick={() => openModal(u)}
                        >
                          ⚙️
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16,
          }}
          onClick={e => e.target === e.currentTarget && closeModal()}
        >
          <div style={{
            background: '#1e2235',
            borderRadius: 16,
            padding: 28,
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            border: '1px solid #2d3148',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#e2e8f0' }}>👤 Foydalanuvchi boshqaruvi</h3>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}
              >×</button>
            </div>

            <div style={{ background: '#151828', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 14, lineHeight: 2 }}>
              <div>
                <span style={{ color: '#64748b' }}>ID:</span>{' '}
                <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{getId(selected)}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Ism:</span>{' '}
                <span style={{ color: '#e2e8f0' }}>{getName(selected) || <span style={{ color: '#475569' }}>—</span>}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Username:</span>{' '}
                {selected.username ? (
                  <a href={`https://t.me/${selected.username}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
                    @{selected.username}
                  </a>
                ) : <span style={{ color: '#475569' }}>—</span>}
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Til:</span>{' '}
                <span>{langFlag[getLang(selected)] || '🌐'} {getLang(selected)}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Kredit:</span>{' '}
                <span style={{ color: '#a78bfa', fontWeight: 600 }}>🎟 {selected.credits || 0} ta</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Holat:</span>{' '}
                {selected.is_premium
                  ? <span style={{ color: '#a78bfa', fontWeight: 600 }}>💎 Premium</span>
                  : <span style={{ color: '#94a3b8' }}>Oddiy</span>}
              </div>
              {(selected.last_seen || selected.created_at) && (
                <div>
                  <span style={{ color: '#64748b' }}>Ro'yxatdan:</span>{' '}
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>{formatDate(selected.created_at)}</span>
                </div>
              )}
              {selected.last_seen && (
                <div>
                  <span style={{ color: '#64748b' }}>So'nggi faollik:</span>{' '}
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>{formatDate(selected.last_seen)}</span>
                </div>
              )}
              {selected.message_count > 0 && (
                <div>
                  <span style={{ color: '#64748b' }}>Xabarlar:</span>{' '}
                  <span style={{ color: '#94a3b8' }}>{selected.message_count} ta</span>
                </div>
              )}
            </div>

            {/* Premium boshqaruv */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Premium boshqaruv
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    background: selected.is_premium ? '#2d3148' : '#4c1d95',
                    color: selected.is_premium ? '#94a3b8' : '#a78bfa',
                    border: `1px solid ${selected.is_premium ? '#374151' : '#6d28d9'}`,
                    opacity: saving ? 0.6 : 1,
                  }}
                  onClick={() => savePremium(true)}
                  disabled={saving || selected.is_premium}
                >
                  💎 Premium berish
                </button>
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    background: !selected.is_premium ? '#2d3148' : '#3b0000',
                    color: !selected.is_premium ? '#94a3b8' : '#f87171',
                    border: `1px solid ${!selected.is_premium ? '#374151' : '#7f1d1d'}`,
                    opacity: saving ? 0.6 : 1,
                  }}
                  onClick={() => savePremium(false)}
                  disabled={saving || !selected.is_premium}
                >
                  ❌ Olib tashlash
                </button>
              </div>
            </div>

            {/* Kredit */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Kredit (1 kredit = 1 pulli kino)
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  placeholder="Nechta kredit? (mas: 3)"
                  value={creditInput}
                  onChange={e => setCreditInput(e.target.value)}
                  style={{ flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && addCredits()}
                  inputMode="numeric"
                />
                <button
                  className="btn btn-primary"
                  onClick={addCredits}
                  disabled={saving || !creditInput}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  ➕ Qo'shish
                </button>
                {(selected.credits || 0) > 0 && (
                  <button
                    className="btn"
                    style={{ background: '#3b0000', color: '#f87171', border: '1px solid #7f1d1d', whiteSpace: 'nowrap' }}
                    onClick={removeCredits}
                    disabled={saving}
                  >
                    🗑 Sıfırla
                  </button>
                )}
              </div>
            </div>

            {/* Referral link */}
            <div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Referral link
              </div>
              <div style={{
                background: '#151828',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                fontFamily: 'monospace',
                color: '#60a5fa',
                wordBreak: 'break-all',
                marginBottom: 8,
                border: '1px solid #2d3148',
              }}>
                {refLink(getId(selected))}
              </div>
              <button
                className="btn btn-sm"
                style={{ background: '#0c2340', color: '#60a5fa', border: '1px solid #1d4ed8', width: '100%' }}
                onClick={() => copyLink(getId(selected))}
              >
                {copied ? '✅ Nusxalandi!' : '📋 Linkni nusxalash'}
              </button>
              {!BOT_USERNAME && (
                <div style={{ color: '#fbbf24', fontSize: 11, marginTop: 6 }}>
                  ⚠️ To'liq link uchun Vercel → <code>VITE_BOT_USERNAME</code> = bot username qo'shing
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
