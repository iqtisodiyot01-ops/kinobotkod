-- ============================================================
-- KinoKod Admin Panel — To'liq Supabase Setup SQL
-- Supabase Dashboard → SQL Editor → New Query → Run
-- Mavjud ma'lumotlarni o'CHIRMAYDI — faqat qo'shadi
-- ============================================================

-- ─── 1. USERS jadvali ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    telegram_id   BIGINT UNIQUE NOT NULL,
    language      TEXT         DEFAULT 'uz',
    full_name     TEXT         DEFAULT '',
    username      TEXT         DEFAULT '',
    is_premium    BOOLEAN      DEFAULT FALSE,
    is_blocked    BOOLEAN      DEFAULT FALSE,
    referral_from BIGINT       DEFAULT NULL,
    referral_count INT         DEFAULT 0,
    credits       INT          DEFAULT 0,
    last_seen     TIMESTAMPTZ  DEFAULT NOW(),
    message_count INT          DEFAULT 0,
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Eski sxemadan migrate (ustunlar yetishmasdan qo'shish)
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id   BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS language      TEXT    DEFAULT 'uz';
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name     TEXT    DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS username      TEXT    DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium    BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked    BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_from BIGINT  DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INT    DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits       INT     DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen     TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS message_count INT    DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW();

-- Eski nom: user_id → telegram_id
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='user_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='telegram_id'
    ) THEN
        ALTER TABLE users RENAME COLUMN user_id TO telegram_id;
    END IF;
END $$;

-- Eski nom: lang → language
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='lang'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='language'
    ) THEN
        ALTER TABLE users RENAME COLUMN lang TO language;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_telegram_id   ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_is_premium    ON users(is_premium);
CREATE INDEX IF NOT EXISTS idx_users_last_seen     ON users(last_seen DESC);

-- ─── 2. MOVIES jadvali ────────────────────────────────────
-- BUG FIX: description ustuni ko'pincha mavjud emas edi
CREATE TABLE IF NOT EXISTS movies (
    id          BIGSERIAL PRIMARY KEY,
    code        TEXT UNIQUE NOT NULL,
    title       TEXT        NOT NULL DEFAULT '',
    description TEXT        DEFAULT '',
    file_id     TEXT        DEFAULT '',
    thumbnail   TEXT        DEFAULT '',
    is_paid     BOOLEAN     DEFAULT FALSE,
    price       INT         DEFAULT 0,
    views       INT         DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE movies ADD COLUMN IF NOT EXISTS description TEXT        DEFAULT '';
ALTER TABLE movies ADD COLUMN IF NOT EXISTS file_id     TEXT        DEFAULT '';
ALTER TABLE movies ADD COLUMN IF NOT EXISTS thumbnail   TEXT        DEFAULT '';
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_paid     BOOLEAN     DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS price       INT         DEFAULT 0;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS views       INT         DEFAULT 0;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_movies_code    ON movies(code);
CREATE INDEX IF NOT EXISTS idx_movies_is_paid ON movies(is_paid);

-- ─── 3. CHANNELS jadvali ─────────────────────────────────
-- BUG FIX: channel_id ustuni ko'pincha mavjud emas edi
CREATE TABLE IF NOT EXISTS channels (
    id          BIGSERIAL PRIMARY KEY,
    channel_id  TEXT UNIQUE NOT NULL,
    title       TEXT        DEFAULT '',
    username    TEXT        DEFAULT '',
    chat_id     TEXT        DEFAULT '',
    is_required BOOLEAN     DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_id  TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS title       TEXT    DEFAULT '';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS username    TEXT    DEFAULT '';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS chat_id     TEXT    DEFAULT '';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT TRUE;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();

-- Agar channel_id bo'sh bo'lsa, username dan to'ldirish
UPDATE channels
SET channel_id = '@' || REPLACE(username, '@', '')
WHERE (channel_id IS NULL OR channel_id = '')
  AND username IS NOT NULL
  AND username != '';

-- UNIQUE constraint qo'shish (xavfsiz)
DO $$ BEGIN
    ALTER TABLE channels ADD CONSTRAINT channels_channel_id_unique UNIQUE (channel_id);
EXCEPTION WHEN duplicate_table THEN NULL;
            WHEN others THEN NULL;
END $$;

-- ─── 4. BROADCASTS jadvali ───────────────────────────────
CREATE TABLE IF NOT EXISTS broadcasts (
    id           BIGSERIAL PRIMARY KEY,
    message      TEXT        NOT NULL DEFAULT '',
    sent_count   INT         DEFAULT 0,
    failed_count INT         DEFAULT 0,
    status       TEXT        DEFAULT 'pending',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS failed_count INT  DEFAULT 0;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- status CHECK constraint (xavfsiz qo'shish)
DO $$ BEGIN
    ALTER TABLE broadcasts ADD CONSTRAINT broadcasts_status_check
        CHECK (status IN ('pending', 'sending', 'done', 'failed'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 5. PAYMENTS jadvali ─────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id          BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT,
    user_id     BIGINT,        -- muqobil nom (eski sxemalar uchun)
    amount      INT         NOT NULL DEFAULT 0,
    currency    TEXT        DEFAULT 'UZS',
    status      TEXT        DEFAULT 'pending',
    provider    TEXT        DEFAULT 'card',
    note        TEXT        DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id     BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency    TEXT DEFAULT 'UZS';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider    TEXT DEFAULT 'card';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS note        TEXT DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status);

-- ─── 6. SUPPORT MESSAGES jadvali ─────────────────────────
CREATE TABLE IF NOT EXISTS support_messages (
    id          BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT      NOT NULL,
    username    TEXT        DEFAULT '',
    first_name  TEXT        DEFAULT '',
    message     TEXT        NOT NULL,
    status      TEXT        DEFAULT 'new',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_telegram_id ON support_messages(telegram_id);
CREATE INDEX IF NOT EXISTS idx_support_status      ON support_messages(status);
CREATE INDEX IF NOT EXISTS idx_support_created_at  ON support_messages(created_at DESC);

-- ─── 7. ADS jadvali ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ads (
    id         BIGSERIAL PRIMARY KEY,
    type       TEXT        DEFAULT 'website',
    title      TEXT        NOT NULL DEFAULT '',
    url        TEXT        DEFAULT '',
    caption    TEXT        DEFAULT '',
    status     TEXT        DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. RLS POLICIES (Row Level Security) ────────────────
-- service_role key bilan barcha amallarni ruxsat berish

ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads              ENABLE ROW LEVEL SECURITY;

-- Mavjud policy-larni o'chirmasdan, yo'q bo'lganlarini yaratish
DO $$ BEGIN
    CREATE POLICY "service_role_all_users" ON users
        FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "service_role_all_movies" ON movies
        FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "service_role_all_channels" ON channels
        FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "service_role_all_broadcasts" ON broadcasts
        FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "service_role_all_payments" ON payments
        FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "service_role_all_support" ON support_messages
        FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "service_role_all_ads" ON ads
        FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 9. STORAGE: broadcast-media bucket ─────────────────
-- BUG FIX: bucket mavjud emas edi
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'broadcast-media',
    'broadcast-media',
    true,
    52428800,  -- 50MB limit
    ARRAY[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/quicktime', 'video/webm',
        'application/pdf', 'application/zip',
        'audio/mpeg', 'audio/ogg'
    ]
)
ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = 52428800;

-- Storage: public o'qish ruxsati
DO $$ BEGIN
    CREATE POLICY "broadcast_media_public_read"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'broadcast-media');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Storage: upload ruxsati (service_role key bilan)
DO $$ BEGIN
    CREATE POLICY "broadcast_media_upload"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'broadcast-media');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Storage: o'chirish ruxsati
DO $$ BEGIN
    CREATE POLICY "broadcast_media_delete"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'broadcast-media');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 10. YORDAMCHI FUNKSIYALAR ───────────────────────────
CREATE OR REPLACE FUNCTION increment_referrals(uid BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET referral_count = COALESCE(referral_count, 0) + 1
    WHERE telegram_id = uid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_message_count(uid BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET message_count = COALESCE(message_count, 0) + 1,
        last_seen = NOW()
    WHERE telegram_id = uid;
END;
$$ LANGUAGE plpgsql;

-- ─── 11. TEKSHIRISH ──────────────────────────────────────
SELECT
    t.table_name,
    (
        SELECT string_agg(c.column_name, ', ' ORDER BY c.ordinal_position)
        FROM information_schema.columns c
        WHERE c.table_name = t.table_name
          AND c.table_schema = 'public'
    ) AS columns
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

SELECT '✅ Setup muvaffaqiyatli bajarildi!' AS result;
