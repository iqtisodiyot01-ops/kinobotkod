import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const MEDIA_TYPES = [
  { value: '', label: '📝 Faqat matn' },
  { value: 'photo', label: '🖼️ Rasm (photo)' },
  { value: 'video', label: '🎬 Video' },
  { value: 'document', label: '📎 Hujjat' },
  { value: 'animation', label: '🎞️ Animatsiya (GIF)' },
]

const PARSE_MODES = [
  { value: '', label: 'Oddiy matn' },
  { value: 'HTML', label: 'HTML' },
  { value: 'Markdown', label: 'Markdown' },
]

const MEDIA_ACCEPT = {
  photo: 'image/jpeg,image/png,image/webp',
  video: 'video/mp4,video/quicktime',
  document: '*/*',
  animation: 'image/gif,video/mp4',
}

const MAX_SIZE = {
  photo: 10 * 1024 * 1024,   // 10 MB
  video: 50 * 1024 * 1024,   // 50 MB
  document: 50 * 1024 * 1024,
  animation: 10 * 1024 * 1024,
}

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function Broadcast() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [botToken, setBotToken] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  // Form fields
  const [text, setText] = useState('')
  const [mediaType, setMediaType] = useState('')
  const [mediaSource, setMediaSource] = useState('fileid') // 'fileid' | 'url' | 'upload'
  const [fileId, setFileId] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [parseMode, setParseMode] = useState('')

  // File upload
  const fileInputRef = useRef(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [uploadError, setUploadError] = useState('')

  // Preview
  const [previewChatId, setPreviewChatId] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [previewResult, setPreviewResult] = useState(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('broadcasts').select('*').limit(30)
    setHistory((data || []).sort((a, b) => b.id - a.id))
    setLoading(false)
  }, [])

  useEffect(() => {
    loadHistory()
    const saved = localStorage.getItem('kk_bot_token')
    if (saved) setBotToken(saved)
    const savedChatId = localStorage.getItem('kk_preview_chat_id')
    if (savedChatId) setPreviewChatId(savedChatId)
  }, [loadHistory])

  // Resolve the actual file_id or URL to send
  const resolveMedia = () => {
    if (!mediaType) return { fileIdOrUrl: null, useUrl: false }
    if (mediaSource === 'fileid') return { fileIdOrUrl: fileId.trim() || null, useUrl: false }
    if (mediaSource === 'url') return { fileIdOrUrl: mediaUrl.trim() || null, useUrl: true }
    if (mediaSource === 'upload') return { fileIdOrUrl: uploadedUrl || null, useUrl: true }
    return { fileIdOrUrl: null, useUrl: false }
  }

  const buildTelegramPayload = (chatId, text, mediaType, mediaValue, parseMode) => {
    const base = { chat_id: chatId }
    if (parseMode) base.parse_mode = parseMode
    if (!mediaType || !mediaValue) {
      return { method: 'sendMessage', body: { ...base, text: text || ' ' } }
    }
    const methodMap = {
      photo: 'sendPhoto',
      video: 'sendVideo',
      document: 'sendDocument',
      animation: 'sendAnimation',
    }
    const fieldMap = {
      photo: 'photo',
      video: 'video',
      document: 'document',
      animation: 'animation',
    }
    return {
      method: methodMap[mediaType],
      body: {
        ...base,
        [fieldMap[mediaType]]: mediaValue,
        ...(text ? { caption: text } : {}),
      },
    }
  }

  const sendToUser = async (token, chatId) => {
    const { fileIdOrUrl } = resolveMedia()
    const { method, body } = buildTelegramPayload(chatId, text.trim(), mediaType, fileIdOrUrl, parseMode)
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      return json.ok
    } catch {
      return false
    }
  }

  const handlePreview = async () => {
    const token = botToken.trim()
    if (!token) { setPreviewResult({ ok: false, msg: 'Bot token kiritilmagan!' }); return }
    const chatId = previewChatId.trim()
    if (!chatId) { setPreviewResult({ ok: false, msg: 'Chat ID yoki username kiriting' }); return }
    if (!text.trim() && !fileId.trim() && !mediaUrl.trim() && !uploadedUrl) {
      setPreviewResult({ ok: false, msg: 'Kamida matn yoki media kiriting' }); return
    }
    localStorage.setItem('kk_preview_chat_id', chatId)
    setPreviewing(true)
    setPreviewResult(null)
    const ok = await sendToUser(token, chatId)
    setPreviewResult({ ok, msg: ok ? `✅ "${chatId}" ga yuborildi` : '❌ Yuborib bo\'lmadi. Token, chat ID va media URL/file_id to\'g\'riligini tekshiring.' })
    setPreviewing(false)
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploadedUrl('')

    const maxSize = MAX_SIZE[mediaType] || MAX_SIZE.document
    if (file.size > maxSize) {
      setUploadError(`Fayl hajmi ${formatBytes(file.size)} — maksimum ${formatBytes(maxSize)}`)
      return
    }

    setUploadFile(file)
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${mediaType || 'file'}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('broadcast-media')
      .upload(path, file, { upsert: false })

    if (upErr) {
      // Bucket yo'q bo'lsa aniqroq xato
      if (upErr.message?.includes('Bucket not found') || upErr.message?.includes('bucket')) {
        setUploadError('Supabase Storage "broadcast-media" bucket topilmadi. Supabase → Storage → New bucket → "broadcast-media" (public) yarating.')
      } else {
        setUploadError('Yuklash xatosi: ' + upErr.message)
      }
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('broadcast-media').getPublicUrl(path)
    setUploadedUrl(publicUrl)
    setUploading(false)
  }

  const startBroadcast = async () => {
    const { fileIdOrUrl } = resolveMedia()
    if (!text.trim() && !fileIdOrUrl) {
      alert('Kamida xabar matni yoki media kiriting!'); return
    }
    const token = botToken.trim() || import.meta.env.VITE_BOT_TOKEN || ''
    if (!token) { alert('Bot token kiriting!'); return }
    localStorage.setItem('kk_bot_token', token)
    setSending(true)
    setResult(null)

    // Paginated user fetch (Supabase 1000-row limit bypass)
    let allIds = []
    let offset = 0
    while (true) {
      const { data: batch } = await supabase.from('users').select('telegram_id,user_id').range(offset, offset + 999)
      if (!batch || batch.length === 0) break
      allIds = allIds.concat(batch.map(u => u.telegram_id || u.user_id).filter(Boolean))
      if (batch.length < 1000) break
      offset += 1000
    }
    const total = allIds.length

    const { data: bc } = await supabase.from('broadcasts').insert({
      message: text.trim() || '[Media]',
      sent_count: 0,
      status: 'sending',
    }).select().single()

    setResult({ status: 'sending', total, sent: 0, failed: 0 })

    let sent = 0, failed = 0
    for (let i = 0; i < allIds.length; i++) {
      const ok = await sendToUser(token, allIds[i])
      if (ok) sent++; else failed++
      // Rate limit: Telegram allows ~30 msg/sec to different users
      if (i % 25 === 24) await new Promise(r => setTimeout(r, 1000))
      if (i % 50 === 49) setResult(r => ({ ...r, sent, failed }))
    }

    if (bc) {
      await supabase.from('broadcasts').update({ sent_count: sent, status: 'done' }).eq('id', bc.id)
    }
    setResult({ status: 'done', total, sent, failed })
    setSending(false)
    loadHistory()
  }

  const statusBadge = (s) => {
    if (s === 'done') return <span className="badge badge-green">✅ Bajarildi</span>
    if (s === 'sending') return <span className="badge badge-blue">⏳ Yuborilmoqda</span>
    return <span className="badge">{s}</span>
  }

  const mediaLabel = MEDIA_TYPES.find(t => t.value === mediaType)?.label || '📝 Faqat matn'
  const hasMedia = mediaType && (
    (mediaSource === 'fileid' && fileId.trim()) ||
    (mediaSource === 'url' && mediaUrl.trim()) ||
    (mediaSource === 'upload' && uploadedUrl)
  )

  return (
    <>
      <div className="page-title">📡 Broadcast</div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">🔑 Bot sozlamalari</span>
        </div>
        <div style={{ padding: 20 }}>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label">Bot Token</label>
            <input
              className="form-input"
              type="password"
              placeholder="Bir marta kiriting — saqlab qolinadi"
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
            />
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
              {botToken ? '✅ Token saqlangan' : '⚠️ Bot tokenini kiriting (bir marta)'}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">📝 Xabar tuzish</span>
        </div>
        <div style={{ padding: 20 }}>
          {/* Xabar matni */}
          <div className="form-group">
            <label className="form-label">
              Xabar matni
              {mediaType ? ' (caption, ixtiyoriy, max 1024 belgi)' : ' *'}
            </label>
            <textarea
              className="form-input"
              rows={5}
              placeholder="Barcha foydalanuvchilarga yuboriladigan xabar..."
              value={text}
              onChange={e => setText(e.target.value)}
              style={{ resize: 'vertical' }}
              maxLength={mediaType ? 1024 : 4096}
            />
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4, textAlign: 'right' }}>
              {text.length} / {mediaType ? 1024 : 4096}
            </div>
          </div>

          {/* Parse mode */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">Matn formati</label>
              <select
                className="form-input"
                value={parseMode}
                onChange={e => setParseMode(e.target.value)}
              >
                {PARSE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {/* Media turi */}
          <div className="form-group">
            <label className="form-label">Media turi</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MEDIA_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: mediaType === t.value ? '#312e81' : '#1e2235',
                    color: mediaType === t.value ? '#a5b4fc' : '#94a3b8',
                    border: `1px solid ${mediaType === t.value ? '#6366f1' : '#2d3148'}`,
                  }}
                  onClick={() => { setMediaType(t.value); setFileId(''); setMediaUrl(''); setUploadedUrl(''); setUploadFile(null); setUploadError('') }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Media manba */}
          {mediaType && (
            <div style={{
              background: '#14172099',
              border: '1px solid #2d3148',
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Media manba</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'fileid', label: '🆔 Telegram File ID' },
                    { value: 'url', label: '🔗 URL' },
                    { value: 'upload', label: '📤 Fayl yuklash' },
                  ].map(s => (
                    <button
                      key={s.value}
                      type="button"
                      className="btn btn-sm"
                      style={{
                        background: mediaSource === s.value ? '#0c2340' : '#1e2235',
                        color: mediaSource === s.value ? '#60a5fa' : '#94a3b8',
                        border: `1px solid ${mediaSource === s.value ? '#1d4ed8' : '#2d3148'}`,
                      }}
                      onClick={() => { setMediaSource(s.value); setFileId(''); setMediaUrl(''); setUploadedUrl(''); setUploadFile(null); setUploadError('') }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {mediaSource === 'fileid' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Telegram File ID
                    <span style={{ color: '#475569', fontWeight: 400, marginLeft: 6 }}>
                      (BAACAgIA... kabi uzun string)
                    </span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="BAACAgIAAxkBAAIBX..."
                    value={fileId}
                    onChange={e => setFileId(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                  />
                  {fileId && fileId.length < 20 && (
                    <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 4 }}>
                      ⚠️ file_id odatda 50+ belgi bo'ladi — to'liq nusxaladingizmi?
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                    💡 <b>file_id olish:</b> Botga rasm/video yuboring — bot file_id qaytaradi.
                    Yoki @getidsbot ga yuboring.
                  </div>
                </div>
              )}

              {mediaSource === 'url' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Media URL</label>
                  <input
                    className="form-input"
                    placeholder="https://example.com/image.jpg"
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                  />
                </div>
              )}

              {mediaSource === 'upload' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Fayl tanlash
                    <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
                      (maks: {formatBytes(MAX_SIZE[mediaType] || MAX_SIZE.document)})
                    </span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={MEDIA_ACCEPT[mediaType] || '*/*'}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#1e2235', color: '#94a3b8', border: '1px solid #2d3148' }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? '⏳ Yuklanmoqda...' : '📂 Fayl tanlash'}
                    </button>
                    {uploadFile && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {uploadFile.name} ({formatBytes(uploadFile.size)})
                      </span>
                    )}
                  </div>
                  {uploadError && (
                    <div style={{ color: '#f87171', fontSize: 12, marginTop: 6, padding: '6px 10px', background: '#2e0a0a', borderRadius: 6 }}>
                      ❌ {uploadError}
                    </div>
                  )}
                  {uploadedUrl && (
                    <div style={{ color: '#4ade80', fontSize: 12, marginTop: 6 }}>
                      ✅ Yuklandi:{' '}
                      <a href={uploadedUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
                        Ko'rish
                      </a>
                    </div>
                  )}
                  {!uploadedUrl && (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                      💡 Supabase → Storage → <b>broadcast-media</b> (public bucket) bo'lishi kerak
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ko'rinishni tekshirish */}
          <div style={{
            background: '#0c2340',
            border: '1px solid #1d4ed8',
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#60a5fa', fontSize: 14 }}>
              🔍 Ko'rinishni tekshirish (Preview)
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
              Broadcast yuborishdan oldin o'z chatingizga test yuboring
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Sizning Telegram ID yoki @username</label>
                <input
                  className="form-input"
                  placeholder="@username yoki 123456789"
                  value={previewChatId}
                  onChange={e => setPreviewChatId(e.target.value)}
                  style={{ padding: '8px 12px' }}
                />
              </div>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#0c2340', color: '#60a5fa', border: '1px solid #1d4ed8' }}
                onClick={handlePreview}
                disabled={previewing}
              >
                {previewing ? '⏳ Yuborilmoqda...' : '📨 Test yuborish'}
              </button>
            </div>
            {previewResult && (
              <div style={{
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: 6,
                background: previewResult.ok ? '#0a2e1a' : '#2e0a0a',
                color: previewResult.ok ? '#4ade80' : '#f87171',
                fontSize: 13,
              }}>
                {previewResult.msg}
              </div>
            )}
          </div>

          {/* Yuborish natijasi */}
          {result && (
            <div style={{
              background: '#14172099',
              border: '1px solid #2d3148',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                {result.status === 'done' ? '✅ Broadcast tugadi' : '⏳ Yuborilmoqda...'}
              </div>
              <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                Jami: {result.total} | ✅ Yuborildi: {result.sent} | ❌ Xato: {result.failed}
              </div>
              {result.status === 'sending' && (
                <div style={{ height: 6, background: '#2d3148', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${result.total > 0 ? Math.round(((result.sent + result.failed) / result.total) * 100) : 0}%`,
                    background: '#6366f1',
                    transition: 'width 0.5s',
                  }} />
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {(text || hasMedia) && (
            <div style={{
              background: '#1a2035',
              border: '1px solid #2d3148',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 13,
              color: '#94a3b8',
            }}>
              📤 Yuborish turi:{' '}
              <b style={{ color: '#e2e8f0' }}>
                {mediaType ? mediaLabel : '📝 Oddiy matn'}
                {hasMedia ? ' + media ✅' : mediaType ? ' (media kiritilmagan ⚠️)' : ''}
              </b>
              {parseMode && <span style={{ marginLeft: 8 }}>| Format: <b>{parseMode}</b></span>}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={startBroadcast}
            disabled={
              sending ||
              (!text.trim() && !hasMedia) ||
              (!botToken.trim() && !import.meta.env.VITE_BOT_TOKEN)
            }
            style={{ minWidth: 160 }}
          >
            {sending ? '⏳ Yuborilmoqda...' : '📡 Hammaga yuborish'}
          </button>
        </div>
      </div>

      {/* Broadcast tarixi */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📋 Broadcast tarixi</span>
          <button className="btn btn-sm" style={{ background: '#1e2235', color: '#94a3b8' }} onClick={loadHistory}>
            🔄 Yangilash
          </button>
        </div>
        {loading ? (
          <div className="loading">Yuklanmoqda...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Xabar</th>
                  <th>Yuborildi</th>
                  <th>Holat</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && <tr><td colSpan={4} className="empty">Tarix yo'q</td></tr>}
                {history.map(b => (
                  <tr key={b.id}>
                    <td style={{ maxWidth: 300 }}>
                      {(b.message || '').slice(0, 60)}{(b.message || '').length > 60 ? '...' : ''}
                    </td>
                    <td>{b.sent_count || 0}</td>
                    <td>{statusBadge(b.status)}</td>
                    <td style={{ color: '#64748b', fontSize: 12 }}>
                      {b.created_at ? new Date(b.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
