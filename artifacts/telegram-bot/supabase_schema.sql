-- Supabase SQL Editor ga bu kodni joylashtiring va Run tugmasini bosing
-- URL: https://supabase.com/dashboard/project/fkomjjvwdbxbapnivfez/sql/new

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

-- Default kategoriyalar
INSERT INTO categories (name, name_uz) VALUES
  ('Action', 'Jangovar'),
  ('Comedy', 'Komediya'),
  ('Drama', 'Drama'),
  ('Horror', 'Qo''rqinchli'),
  ('Romance', 'Romantik'),
  ('Sci-Fi', 'Fantastika'),
  ('Animation', 'Multfilm'),
  ('Thriller', 'Triller')
ON CONFLICT (name) DO NOTHING;

-- Default bot sozlamalari
INSERT INTO bot_settings (key, value) VALUES
  ('welcomeMessage', 'Xush kelibsiz! Kino qidirish uchun nom yozing.'),
  ('searchPrompt', 'Qidirayotgan kinongiz nomini yozing:'),
  ('notFoundMessage', 'Kechirasiz, bu kino topilmadi.'),
  ('requireChannelJoin', 'false'),
  ('channelUsername', ''),
  ('referralEnabled', 'true'),
  ('referralBonus', '0'),
  ('maintenanceMode', 'false')
ON CONFLICT (key) DO NOTHING;

-- Default bot buyruqlari
INSERT INTO bot_commands (command, description, enabled) VALUES
  ('start', 'Botni boshlash', true),
  ('search', 'Kino qidirish', true),
  ('top', 'Top kinolar', true),
  ('referral', 'Referral havolasi', true),
  ('help', 'Yordam', true)
ON CONFLICT (command) DO NOTHING;

-- Tekshirish
SELECT 'Jadvallar muvaffaqiyatli yaratildi!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
