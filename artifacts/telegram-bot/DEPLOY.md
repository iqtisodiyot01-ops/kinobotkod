# Railway Deploy Qilish Qo'llanmasi

## 1. Bot (Telegram Bot) - Railway Worker Service

### Qadamlar:
1. **railway.app** ga kiring
2. **New Project** → **Deploy from GitHub repo**
3. `iqtisodiyot01-ops/kinobotkod` ni tanlang
4. **Root Directory**: `artifacts/telegram-bot`
5. **Service Type**: `Worker` (HTTP port kerak emas)

### Environment Variables (Settings > Variables):
```
TELEGRAM_BOT_TOKEN=8514248979:AAGeTEjSNN1Ojbm4elkf91gSbOi4vYOu2DM
ADMIN_TELEGRAM_ID=7914882474
DATABASE_URL=<Supabase yoki Railway PostgreSQL connection string>
```

---

## 2. API Server - Railway Web Service

### Qadamlar:
1. Bir xil projectda **New Service** → **GitHub repo**
2. **Root Directory**: `artifacts/api-server`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `node dist/index.mjs`

### Environment Variables:
```
DATABASE_URL=<Supabase yoki Railway PostgreSQL connection string>
SESSION_SECRET=random_secret_string_here
NODE_ENV=production
```

---

## 3. Supabase - Database Connection String

Supabase da to'liq connection string olish uchun:
1. Supabase dashboard → Project Settings → Database
2. **Connection string** → **URI** tab
3. `[YOUR-PASSWORD]` o'rniga real parolni kiriting

To'liq format:
```
postgresql://postgres:[YOUR-PASSWORD]@db.fkomjjvwdbxbapnivfez.supabase.co:5432/postgres
```

---

## 4. Admin Panel - Railway Static Site yoki Vercel

### Railway da:
1. **New Service** → GitHub repo
2. **Root Directory**: `artifacts/admin-panel`
3. **Build Command**: `pnpm install && pnpm run build`
4. **Output Directory**: `dist/public`

### Vercel da (osonroq):
1. vercel.com → **Import Project**
2. GitHub repo → `artifacts/admin-panel` folder
3. Framework: **Vite**
4. Build: `pnpm run build`
5. Output: `dist/public`

---

## 5. Database Schema yaratish

Supabase da schema yaratish uchun SQL Editor ga quyidagini nusxalang:

```sql
CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  title_uz TEXT,
  description TEXT,
  year INTEGER,
  language TEXT DEFAULT 'uz',
  category TEXT,
  file_id TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  views INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  total_requests INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_active_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_uz TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_commands (
  id SERIAL PRIMARY KEY,
  command TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  target_filter TEXT DEFAULT 'all',
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS movie_requests (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER,
  telegram_id TEXT,
  requested_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  new_users INTEGER NOT NULL DEFAULT 0,
  requests INTEGER NOT NULL DEFAULT 0
);
```
