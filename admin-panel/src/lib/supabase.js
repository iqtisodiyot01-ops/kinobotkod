import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

if (!url || !key) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL yoki VITE_SUPABASE_KEY topilmadi!\n' +
    'Vercel → Settings → Environment Variables:\n' +
    '  VITE_SUPABASE_URL = https://xxxx.supabase.co\n' +
    '  VITE_SUPABASE_KEY = service_role key (anon emas!)'
  )
}

export const supabase = createClient(url || '', key || '', {
  auth: { persistSession: false },
})

// ─── Storage ───────────────────────────────────────────────
const BUCKET = 'broadcast-media'

/**
 * Faylni Supabase Storage ga yuklaydi va public URL qaytaradi.
 * Bucket yo'q bo'lsa tushunarli xato qaytaradi.
 * @param {File} file
 * @param {'photo'|'video'|'document'|'animation'|'file'} mediaType
 * @returns {Promise<{url: string|null, error: string|null}>}
 */
export async function uploadBroadcastMedia(file, mediaType = 'file') {
  const ext = file.name.split('.').pop()
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const path = `${mediaType}/${safeName}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, cacheControl: '3600' })

  if (upErr) {
    const msg = upErr.message || ''
    if (msg.toLowerCase().includes('bucket') || msg.toLowerCase().includes('not found')) {
      return {
        url: null,
        error:
          'Storage bucket "broadcast-media" topilmadi. ' +
          'Supabase SQL Editor da admin-panel/supabase_setup.sql ni ishga tushiring.',
      }
    }
    return { url: null, error: msg }
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: publicUrl, error: null }
}

// ─── Error formatter ───────────────────────────────────────
/**
 * Supabase xato obyektini foydalanuvchiga tushunarli matnga aylantiradi.
 * @param {object|null} error
 * @param {string} [tableName]
 * @returns {string}
 */
export function formatSupabaseError(error, tableName = '') {
  if (!error) return ''
  const msg = error.message || String(error)

  if (msg.includes('Could not find the') && msg.includes('column')) {
    const tbl = msg.match(/column of '(\w+)'/)?.[1] || tableName
    return (
      `DB sxemasi eskirgan — "${tbl}" jadvalida kerakli ustun yo'q. ` +
      'Supabase SQL Editor da admin-panel/supabase_setup.sql ni ishga tushiring.'
    )
  }
  if (msg.includes('permission denied') || msg.includes('RLS') || msg.includes('row-level')) {
    return 'Ruxsat yo\'q. VITE_SUPABASE_KEY = service_role key bo\'lishi kerak.'
  }
  if (msg.includes('unique') || msg.includes('duplicate')) {
    return 'Bu yozuv allaqachon mavjud.'
  }
  if (msg.includes('not-null') || msg.includes('null value')) {
    return 'Majburiy maydon bo\'sh.'
  }
  return msg
}
