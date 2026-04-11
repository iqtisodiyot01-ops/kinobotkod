-- Supabase SQL Editor da shu kodni ishga tushiring:
-- https://supabase.com/dashboard/project/fkomjjvwdbxbapnivfez/sql/new

CREATE TABLE IF NOT EXISTS movies (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    file_id TEXT,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channels (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    chat_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    lang TEXT DEFAULT 'uz',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
