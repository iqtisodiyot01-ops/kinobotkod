-- ==========================================================
-- KinoKod Bot - To'liq Supabase SQL sxemasi
-- Supabase SQL Editor'da ishlating:
-- https://supabase.com/dashboard/project/fkomjjvwdbxbapnivfez/sql/new
-- Hamma kodni tanlang va RUN tugmasini bosing
-- ==========================================================

-- 1. Users jadvali
CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    language    TEXT DEFAULT 'uz',
    full_name   TEXT DEFAULT '',
    username    TEXT DEFAULT '',
    is_premium  BOOLEAN DEFAULT FALSE,
    is_blocked  BOOLEAN DEFAULT FALSE,
    referral_from BIGINT DEFAULT NULL,
    referral_count INT DEFAULT 0,
    credits     INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_is_premium ON users(is_premium);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 2. Movies jadvali
CREATE TABLE IF NOT EXISTS movies (
    id          BIGSERIAL PRIMARY KEY,
    code        TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    is_paid     BOOLEAN DEFAULT FALSE,
    price       INT DEFAULT 0,
    file_id     TEXT DEFAULT '',
    thumbnail   TEXT DEFAULT '',
    views       INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movies_code ON movies(code);
CREATE INDEX IF NOT EXISTS idx_movies_is_paid ON movies(is_paid);
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies USING gin(to_tsvector('simple', title));

-- 3. Channels jadvali
CREATE TABLE IF NOT EXISTS channels (
    id          BIGSERIAL PRIMARY KEY,
    channel_id  TEXT UNIQUE NOT NULL,
    title       TEXT DEFAULT '',
    username    TEXT DEFAULT '',
    is_required BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Broadcasts jadvali
CREATE TABLE IF NOT EXISTS broadcasts (
    id          BIGSERIAL PRIMARY KEY,
    message     TEXT NOT NULL,
    sent_count  INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payments jadvali
CREATE TABLE IF NOT EXISTS payments (
    id          BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT,
    amount      INT NOT NULL DEFAULT 0,
    currency    TEXT DEFAULT 'UZS',
    status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    provider    TEXT DEFAULT 'card',
    receipt_file_id TEXT DEFAULT '',
    note        TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 6. Support messages jadvali
CREATE TABLE IF NOT EXISTS support_messages (
    id          BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    username    TEXT DEFAULT '',
    first_name  TEXT DEFAULT '',
    message     TEXT NOT NULL,
    status      TEXT DEFAULT 'new' CHECK (status IN ('new', 'read')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_telegram_id ON support_messages(telegram_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);

-- 7. Ads jadvali
CREATE TABLE IF NOT EXISTS ads (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL DEFAULT '',
    text        TEXT DEFAULT '',
    image_url   TEXT DEFAULT '',
    button_text TEXT DEFAULT '',
    button_url  TEXT DEFAULT '',
    is_active   BOOLEAN DEFAULT TRUE,
    show_count  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Referral increment funksiyasi
CREATE OR REPLACE FUNCTION increment_referrals(uid BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE users SET referral_count = COALESCE(referral_count, 0) + 1 WHERE telegram_id = uid;
END;
$$ LANGUAGE plpgsql;

-- 9. Namuna ma'lumotlar (test uchun)
INSERT INTO channels (channel_id, title, username, is_required)
VALUES ('@kinokanal', 'KinoKanal', 'kinokanal', TRUE)
ON CONFLICT (channel_id) DO NOTHING;

-- 10. Tekshirish
SELECT 'Jadvallar muvaffaqiyatli yaratildi! ✅' AS natija;

SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as columns_count
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
