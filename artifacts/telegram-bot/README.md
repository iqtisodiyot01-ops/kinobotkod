# 🎬 Universal Telegram Kino Bot - Pro Version

## O'rnatish (VPS - Ubuntu)

### 1. Talablar
- Node.js 18+
- PostgreSQL
- PM2 (process manager)

### 2. O'rnatish
```bash
# Reponi clone qilish
git clone <repo-url>
cd telegram-bot

# Dependencylarni o'rnatish
npm install

# Environment variables
cp .env.example .env
nano .env  # Bot tokenini kiriting
```

### 3. Database sozlash
```sql
-- PostgreSQL da database yarating
CREATE DATABASE kino_bot;
```

Bot ishga tushganda jadvallarni avtomatik yaratadi (agar backend ishlamoqda bo'lsa).

### 4. Ishga tushirish

#### Development:
```bash
node bot.mjs
```

#### Production (PM2 bilan):
```bash
# PM2 o'rnatish
npm install -g pm2

# Botni boshlash
pm2 start bot.mjs --name kino-bot

# Restart qilish
pm2 restart kino-bot

# Loglarni ko'rish
pm2 logs kino-bot

# Server restart bo'lganda avtomatik ishga tushish
pm2 startup
pm2 save
```

#### Nginx reverse proxy (HTTPS uchun):
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Bot buyruqlari

### Foydalanuvchi buyruqlari:
- `/start` - Botni boshlash
- `/search [nom]` - Kino qidirish
- `/top` - Top kinolar
- `/referral` - Referral havola
- `/help` - Yordam

### Admin buyruqlari:
- `/admin` - Admin paneli
- `/stats` - Statistika
- `/broadcast [xabar]` - Hammaga xabar yuborish
- `/ban [telegram_id]` - Foydalanuvchini bloklash
- `/unban [telegram_id]` - Blokdan chiqarish

## Admin panel orqali kino qo'shish

1. Admin panelga kiring
2. "Kinolar" bo'limiga o'ting
3. "Kino qo'shish" tugmasini bosing
4. Telegram file_id kiriting (kinoni botga yuboring va file_id oling)
5. Saqlang

## Kino file_id olish

Kinoni to'g'ridan-to'g'ri bot chatiga yuboring va logda file_id ni ko'ring, yoki:
1. Kinoni @getmyfileid_bot ga yuboring
2. file_id ni nusxa oling
3. Admin panelda ishlating
