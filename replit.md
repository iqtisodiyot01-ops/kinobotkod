# Universal Telegram Kino Bot - Pro

## Overview

To'liq Telegram kino bot tizimi — bot, admin panel va backend API.

## Loyiha tarkibi

- **Telegram Bot** (`artifacts/telegram-bot/bot.mjs`) — Node.js, VPSga tayyor
- **Admin Panel** (`artifacts/admin-panel`) — React + Vite, to'liq dashboard
- **Backend API** (`artifacts/api-server`) — Express 5, REST API
- **Database** — PostgreSQL + Drizzle ORM

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite + Tailwind CSS

## Bot haqida

- **Token**: `8514248979:AAGeTEjSNN1Ojbm4elkf91gSbOi4vYOu2DM`
- **Admin ID**: `7914882474`
- Bot buyruqlari: `/start`, `/search`, `/top`, `/referral`, `/help`
- Admin buyruqlari: `/admin`, `/stats`, `/broadcast`, `/ban`, `/unban`

## Admin Panel sahifalari

- `/dashboard` — Statistika va grafiklar
- `/movies` — Kinolar ro'yxati (qo'shish/tahrirlash/o'chirish)
- `/users` — Foydalanuvchilar (bloklash/blokdan chiqarish)
- `/broadcast` — Broadcast xabar yuborish
- `/categories` — Kategoriyalar boshqaruvi
- `/bot-settings` — Bot sozlamalari
- `/bot-commands` — Bot buyruqlari

## Database jadvallar

- `movies` — Kinolar
- `bot_users` — Bot foydalanuvchilari
- `categories` — Kategoriyalar
- `bot_settings` — Bot sozlamalari (key-value)
- `bot_commands` — Bot buyruqlari
- `broadcasts` — Broadcast tarixi
- `movie_requests` — Kino so'rovlari
- `daily_stats` — Kunlik statistika

## VPS ga deploy qilish (Bot)

```bash
# Bot papkasiga o'ting
cd artifacts/telegram-bot

# Dependencies o'rnatish
npm install

# .env fayl yarating
cp .env.example .env
# .env da DATABASE_URL va boshqalarni kiriting

# PM2 bilan ishga tushirish
npm install -g pm2
pm2 start bot.mjs --name kino-bot
pm2 startup && pm2 save
```

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/admin-panel run dev` — run admin panel locally
