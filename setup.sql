-- KinoKod Bot — Supabase SQL setup
-- https://supabase.com/dashboard/project/fkomjjvwdbxbapnivfez/sql/new

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id           BIGSERIAL PRIMARY KEY,
    telegram_id  BIGINT UNIQUE NOT NULL,
    full_name    TEXT DEFAULT '',
    username     TEXT DEFAULT '',
    language     TEXT DEFAULT 'uz',
    is_premium   BOOLEAN DEFAULT FALSE,
    referral_from BIGINT DEFAULT NULL,
    referral_count INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- MOVIES
CREATE TABLE IF NOT EXISTS movies (
    id         BIGSERIAL PRIMARY KEY,
    code       TEXT UNIQUE NOT NULL,
    title      TEXT NOT NULL,
    file_id    TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHANNELS
CREATE TABLE IF NOT EXISTS channels (
    id          BIGSERIAL PRIMARY KEY,
    channel_id  TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    username    TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- BROADCASTS
CREATE TABLE IF NOT EXISTS broadcasts (
    id         BIGSERIAL PRIMARY KEY,
    message    TEXT NOT NULL,
    sent_count INT DEFAULT 0,
    status     TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(telegram_id),
    amount     INT NOT NULL,
    currency   TEXT DEFAULT 'UZS',
    status     TEXT DEFAULT 'pending',
    provider   TEXT DEFAULT 'mock',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Increment referral count function
CREATE OR REPLACE FUNCTION increment_referrals(uid BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE users SET referral_count = referral_count + 1 WHERE telegram_id = uid;
END;
$$ LANGUAGE plpgsql;

-- MIGRATION: add columns if upgrading from old schema
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'uz';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_from BIGINT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT TRUE;
