# 🎬 Universal Telegram Kino Bot - Pro

To'liq Telegram kino bot tizimi — admin panel va backend API bilan.

## Tarkib

- **Telegram Bot** (`artifacts/telegram-bot/bot.mjs`) — VPSga tayyor
- **Admin Panel** (`artifacts/admin-panel`) — React + Vite dashboard
- **Backend API** (`artifacts/api-server`) — Express 5 REST API
- **Database** — PostgreSQL + Drizzle ORM

## O'rnatish

### Bot (VPS)
```bash
cd artifacts/telegram-bot
npm install
cp .env.example .env
# .env ni sozlang
node bot.mjs
# yoki PM2 bilan:
pm2 start bot.mjs --name kino-bot
```

### Admin Panel
```bash
pnpm install
pnpm --filter @workspace/admin-panel run dev
```

### Backend API
```bash
pnpm --filter @workspace/api-server run dev
```

## Deploy (Railway)

1. Railway.app da yangi project yarating
2. GitHub repo ni ulang
3. Bot va API uchun alohida service yarating
4. Environment variables qo'shing:
   - `TELEGRAM_BOT_TOKEN`
   - `DATABASE_URL`
   - `ADMIN_TELEGRAM_ID`

## Environment Variables

```env
TELEGRAM_BOT_TOKEN=your_token
ADMIN_TELEGRAM_ID=your_telegram_id
DATABASE_URL=postgresql://...
```
