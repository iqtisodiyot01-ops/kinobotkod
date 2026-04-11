-- ============================================================
-- MIGRATION: Eski sxemadan yangi sxemaga o'tish
-- Supabase SQL Editor'da ishlating:
-- https://supabase.com/dashboard/project/fkomjjvwdbxbapnivfez/sql/new
-- ============================================================

-- 1. Users jadvalini yangilash
ALTER TABLE users RENAME COLUMN user_id TO telegram_id;
ALTER TABLE users RENAME COLUMN lang TO language;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_from BIGINT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0;

-- 2. Channels jadvalini yangilash
ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT TRUE;

-- Eski username -> channel_id (agar channel_id bo'sh bo'lsa)
UPDATE channels SET channel_id = username WHERE channel_id IS NULL AND username IS NOT NULL;

-- 3. Broadcasts jadvali (yangi)
CREATE TABLE IF NOT EXISTS broadcasts (
    id         BIGSERIAL PRIMARY KEY,
    message    TEXT NOT NULL,
    sent_count INT DEFAULT 0,
    status     TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payments jadvali (yangi)
CREATE TABLE IF NOT EXISTS payments (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT,
    amount     INT NOT NULL DEFAULT 0,
    currency   TEXT DEFAULT 'UZS',
    status     TEXT DEFAULT 'pending',
    provider   TEXT DEFAULT 'mock',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Referral increment funksiyasi
CREATE OR REPLACE FUNCTION increment_referrals(uid BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE users SET referral_count = COALESCE(referral_count, 0) + 1 WHERE telegram_id = uid;
END;
$$ LANGUAGE plpgsql;

SELECT 'Migration muvaffaqiyatli bajarildi!' AS result;
