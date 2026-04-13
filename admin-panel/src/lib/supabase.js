import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(url || '', key || '', {
  auth: { persistSession: false },
})

// ─── Storage ───────────────────────────────────────────────
const BUCKET = 'broadcast-media'

export async function uploadBroadcastMedia(file, mediaType = 'file') {
  const ext = file.name.split('.').pop()
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const path = `${mediaType}/${safeName}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, cacheControl: '3600' })

  if (upErr) {
    return { url: null, error: upErr.message || 'Yuklash xatosi' }
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: publicUrl, error: null }
}

// Raw error message — no schema validation logic
export function formatSupabaseError(error) {
  if (!error) return ''
  return error.message || String(error)
}
