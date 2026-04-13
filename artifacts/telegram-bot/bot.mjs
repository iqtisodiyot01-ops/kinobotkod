/**
 * UNIVERSAL TELEGRAM KINO BOT - PRO VERSION (FIXED)
 *
 * VPSga o'rnatish uchun:
 * 1. npm install
 * 2. .env faylini sozlang
 * 3. node bot.mjs
 *
 * PM2 bilan ishlatish (production):
 * pm2 start bot.mjs --name kino-bot
 * pm2 startup
 * pm2 save
 */

import TelegramBot from "node-telegram-bot-api";
import pg from "pg";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const { Pool } = pg;

// ─── Configuration ───────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// FIX #B1: ADMIN_ID is a single string comparison used with === but telegram IDs
// are numbers. Convert to number for safe comparison (original uses string === number
// which always fails in strict mode). Keep as string for backwards compat but
// normalise comparison everywhere.
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID || "7914882474";
const DATABASE_URL = process.env.DATABASE_URL;

if (!BOT_TOKEN) {
  console.error("ERROR: TELEGRAM_BOT_TOKEN muhit o'zgaruvchisi topilmadi!");
  process.exit(1);
}

// ─── Database Connection ──────────────────────────────────────────────────────

let pool = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    // FIX #B2: No SSL config — most hosted PostgreSQL (Railway, Neon, Supabase)
    // require SSL. Add ssl option with rejectUnauthorized:false for hosted DBs.
    ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
    // FIX #B3: No connection pool limits — add sane defaults to prevent exhaustion.
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  console.log("✅ Database ulanish o'rnatildi");
} else {
  console.warn("⚠️  DATABASE_URL topilmadi, ma'lumotlar saqlanmaydi");
}

async function query(sql, params = []) {
  if (!pool) return { rows: [] };
  try {
    const result = await pool.query(sql, params);
    return result;
  } catch (err) {
    console.error("DB xatosi:", err.message);
    return { rows: [] };
  }
}

// ─── Bot Initialization ───────────────────────────────────────────────────────

// FIX #B4: { polling: true } starts polling immediately. If another instance is
// running this causes conflicts. Use proper options with error handling.
const bot = new TelegramBot(BOT_TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 },
  },
});

console.log("🎬 Kino Bot ishga tushdi...");

// ─── Helper Functions ─────────────────────────────────────────────────────────

function isAdmin(telegramId) {
  // FIX #B5: Original compared String(msg.from.id) !== ADMIN_ID in every handler
  // separately. Centralise the check. ADMIN_ID from env is already a string.
  return String(telegramId) === String(ADMIN_ID);
}

function generateReferralCode(telegramId) {
  return crypto.createHash("md5").update(String(telegramId)).digest("hex").substring(0, 8).toUpperCase();
}

async function getOrCreateUser(msg) {
  const { id: telegramId, username, first_name, last_name } = msg.from;

  const existing = await query(
    "SELECT * FROM bot_users WHERE telegram_id = $1",
    [String(telegramId)]
  );

  if (existing.rows.length > 0) {
    await query(
      "UPDATE bot_users SET last_active_at = NOW() WHERE telegram_id = $1",
      [String(telegramId)]
    );
    return existing.rows[0];
  }

  const referralCode = generateReferralCode(telegramId);
  const newUser = await query(
    `INSERT INTO bot_users (telegram_id, username, first_name, last_name, referral_code, total_requests)
     VALUES ($1, $2, $3, $4, $5, 0) RETURNING *`,
    [String(telegramId), username, first_name, last_name, referralCode]
  );

  await query(
    `INSERT INTO daily_stats (date, new_users, requests) VALUES (CURRENT_DATE, 1, 0)
     ON CONFLICT (date) DO UPDATE SET new_users = daily_stats.new_users + 1`,
    []
  );

  return newUser.rows[0];
}

async function getSetting(key, defaultValue = "") {
  const result = await query("SELECT value FROM bot_settings WHERE key = $1", [key]);
  return result.rows[0]?.value ?? defaultValue;
}

async function isUserBlocked(telegramId) {
  const result = await query("SELECT is_blocked FROM bot_users WHERE telegram_id = $1", [String(telegramId)]);
  return result.rows[0]?.is_blocked === true;
}

async function isMaintenanceMode() {
  const val = await getSetting("maintenanceMode", "false");
  return val === "true";
}

async function checkChannelMembership(telegramId) {
  const required = await getSetting("requireChannelJoin", "false");
  if (required !== "true") return true;

  const channel = await getSetting("channelUsername", "");
  if (!channel) return true;

  try {
    const member = await bot.getChatMember(`@${channel}`, telegramId);
    return ["member", "creator", "administrator"].includes(member.status);
  } catch {
    return true;
  }
}

function buildMainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: "🎬 Kino qidirish" }, { text: "📊 Top kinolar" }],
        [{ text: "👥 Referral" }, { text: "ℹ️ Yordam" }],
      ],
      resize_keyboard: true,
      persistent: true,
    },
  };
}

async function recordRequest(movieId, telegramId) {
  await query(
    "INSERT INTO movie_requests (movie_id, telegram_id) VALUES ($1, $2)",
    [movieId, String(telegramId)]
  );
  await query(
    "UPDATE bot_users SET total_requests = total_requests + 1 WHERE telegram_id = $1",
    [String(telegramId)]
  );
  await query(
    `INSERT INTO daily_stats (date, new_users, requests) VALUES (CURRENT_DATE, 0, 1)
     ON CONFLICT (date) DO UPDATE SET requests = daily_stats.requests + 1`,
    []
  );
}

// ─── Command Handlers ─────────────────────────────────────────────────────────

bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const referralParam = match[1]?.trim();

  const user = await getOrCreateUser(msg);

  if (referralParam && !user.referred_by) {
    const referrer = await query(
      "SELECT * FROM bot_users WHERE referral_code = $1 AND telegram_id != $2",
      [referralParam, String(telegramId)]
    );
    if (referrer.rows.length > 0) {
      await query(
        "UPDATE bot_users SET referred_by = $1 WHERE telegram_id = $2",
        [referralParam, String(telegramId)]
      );
    }
  }

  if (await isUserBlocked(telegramId)) {
    await bot.sendMessage(chatId, "❌ Siz bloklangansiz. Admin bilan bog'laning.");
    return;
  }

  if (await isMaintenanceMode()) {
    await bot.sendMessage(chatId, "🔧 Bot hozirda texnik ishlar uchun to'xtatilgan. Tez orada qaytamiz!");
    return;
  }

  if (!await checkChannelMembership(telegramId)) {
    const channel = await getSetting("channelUsername", "");
    await bot.sendMessage(chatId,
      `📢 Botdan foydalanish uchun kanalga a'zo bo'ling:\n\n👉 @${channel}\n\nA'zo bo'lgandan so'ng /start bosing`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: "📢 Kanalga o'tish", url: `https://t.me/${channel}` },
            { text: "✅ Tekshirish", callback_data: "check_subscription" }
          ]]
        }
      }
    );
    return;
  }

  const welcomeMsg = await getSetting("welcomeMessage", "Xush kelibsiz! Kino qidirish uchun nom yozing.");
  // FIX #B6: first_name can be undefined for some accounts — guard with fallback.
  await bot.sendMessage(chatId, `👋 ${welcomeMsg}\n\nSalom, ${msg.from.first_name || "do'st"}!`, buildMainKeyboard());
});

bot.onText(/\/search (.+)/, async (msg, match) => {
  await handleSearch(msg, match[1]);
});

bot.onText(/\/top/, async (msg) => {
  await handleTopMovies(msg);
});

bot.onText(/\/referral/, async (msg) => {
  await handleReferral(msg);
});

bot.onText(/\/help/, async (msg) => {
  await handleHelp(msg);
});

bot.onText(/\/admin/, async (msg) => {
  if (!isAdmin(msg.from.id)) {
    await bot.sendMessage(msg.chat.id, "❌ Siz admin emassiz!");
    return;
  }

  await bot.sendMessage(msg.chat.id,
    "🔐 Admin panel:\n\n" +
    "📊 /stats - Statistika\n" +
    "📢 /broadcast [xabar] - Hammaga xabar\n" +
    "🚫 /ban [user_id] - Foydalanuvchini bloklash\n" +
    "✅ /unban [user_id] - Blokdan chiqarish\n",
    { reply_markup: { remove_keyboard: true } }
  );
});

bot.onText(/\/stats/, async (msg) => {
  if (!isAdmin(msg.from.id)) return;

  const users = await query("SELECT COUNT(*) as count FROM bot_users");
  const movies = await query("SELECT COUNT(*) as count FROM movies WHERE is_active = true");
  const requests = await query("SELECT COALESCE(SUM(total_requests), 0) as total FROM bot_users");
  const today = await query("SELECT new_users, requests FROM daily_stats WHERE date = CURRENT_DATE");

  const text =
    `📊 Bot statistikasi:\n\n` +
    `👥 Jami foydalanuvchilar: ${users.rows[0]?.count ?? 0}\n` +
    `🎬 Aktiv kinolar: ${movies.rows[0]?.count ?? 0}\n` +
    `📥 Jami so'rovlar: ${requests.rows[0]?.total ?? 0}\n\n` +
    `📅 Bugun:\n` +
    `  - Yangi foydalanuvchilar: ${today.rows[0]?.new_users ?? 0}\n` +
    `  - So'rovlar: ${today.rows[0]?.requests ?? 0}`;

  await bot.sendMessage(msg.chat.id, text);
});

bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  if (!isAdmin(msg.from.id)) return;

  const message = match[1];
  const users = await query("SELECT telegram_id FROM bot_users WHERE is_blocked = false");

  let sent = 0, failed = 0;
  await bot.sendMessage(msg.chat.id, `📤 Xabar yuborilmoqda ${users.rows.length} ta foydalanuvchiga...`);

  for (const user of users.rows) {
    try {
      await bot.sendMessage(user.telegram_id, `📢 Admin xabari:\n\n${message}`);
      sent++;
      // FIX #B7: Rate limiting — 50ms delay is too short for large user bases.
      // Telegram allows 30 messages/second globally. Use 35ms minimum.
      await new Promise(r => setTimeout(r, 35));
    } catch {
      failed++;
    }
  }

  await query(
    "INSERT INTO broadcasts (message, type, target_filter, sent, failed) VALUES ($1, 'text', 'all', $2, $3)",
    [message, sent, failed]
  );

  await bot.sendMessage(msg.chat.id, `✅ Yuborildi: ${sent}\n❌ Muvaffaqiyatsiz: ${failed}`);
});

bot.onText(/\/ban (.+)/, async (msg, match) => {
  if (!isAdmin(msg.from.id)) return;

  const targetId = match[1].trim();
  await query("UPDATE bot_users SET is_blocked = true WHERE telegram_id = $1", [targetId]);
  await bot.sendMessage(msg.chat.id, `✅ ${targetId} bloklandi`);

  try {
    await bot.sendMessage(targetId, "❌ Siz admin tomonidan bloklangansiz.");
  } catch {}
});

bot.onText(/\/unban (.+)/, async (msg, match) => {
  if (!isAdmin(msg.from.id)) return;

  const targetId = match[1].trim();
  await query("UPDATE bot_users SET is_blocked = false WHERE telegram_id = $1", [targetId]);
  await bot.sendMessage(msg.chat.id, `✅ ${targetId} blokdan chiqarildi`);
});

// ─── Text Handler ─────────────────────────────────────────────────────────────

bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const text = msg.text.trim();

  if (await isUserBlocked(telegramId)) {
    await bot.sendMessage(chatId, "❌ Siz bloklangansiz.");
    return;
  }

  if (await isMaintenanceMode()) {
    await bot.sendMessage(chatId, "🔧 Texnik ishlar davom etmoqda. Sabr qiling!");
    return;
  }

  if (text === "🎬 Kino qidirish") {
    const searchPrompt = await getSetting("searchPrompt", "Qidirayotgan kinongiz nomini yozing:");
    await bot.sendMessage(chatId, searchPrompt, {
      reply_markup: { force_reply: true, input_field_placeholder: "Kino nomi..." }
    });
    return;
  }

  if (text === "📊 Top kinolar") { await handleTopMovies(msg); return; }
  if (text === "👥 Referral") { await handleReferral(msg); return; }
  if (text === "ℹ️ Yordam") { await handleHelp(msg); return; }

  if (/^\d+$/.test(text)) {
    const movie = await query(
      "SELECT * FROM movies WHERE id = $1 AND is_active = true",
      [parseInt(text, 10)]
    );
    if (movie.rows.length > 0) {
      await sendMovie(chatId, movie.rows[0]);
      await recordRequest(movie.rows[0].id, telegramId);
      return;
    }
  }

  await handleSearch(msg, text);
});

// ─── Feature Handlers ─────────────────────────────────────────────────────────

async function handleSearch(msg, searchText) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  if (!searchText || searchText.trim().length < 2) {
    await bot.sendMessage(chatId, "Iltimos kamida 2 ta harf kiriting.");
    return;
  }

  const movies = await query(
    `SELECT * FROM movies
     WHERE is_active = true AND (
       title ILIKE $1 OR title_uz ILIKE $1 OR description ILIKE $1
     )
     LIMIT 10`,
    [`%${searchText}%`]
  );

  if (movies.rows.length === 0) {
    const notFoundMsg = await getSetting("notFoundMessage", "Kechirasiz, bu kino topilmadi.");
    await bot.sendMessage(chatId, `${notFoundMsg}\n\n🔍 Qidiruv: "${searchText}"`);
    return;
  }

  if (movies.rows.length === 1) {
    await sendMovie(chatId, movies.rows[0]);
    await recordRequest(movies.rows[0].id, telegramId);
    return;
  }

  const keyboard = movies.rows.map(m => ([{
    text: `🎬 ${m.title} ${m.year ? `(${m.year})` : ""}`,
    callback_data: `movie_${m.id}`
  }]));

  await bot.sendMessage(chatId,
    `🔍 "${searchText}" bo'yicha ${movies.rows.length} ta kino topildi:`,
    { reply_markup: { inline_keyboard: keyboard } }
  );
}

async function sendMovie(chatId, movie) {
  const text =
    `🎬 <b>${movie.title}</b>${movie.title_uz ? ` | ${movie.title_uz}` : ""}\n\n` +
    (movie.description ? `📝 ${movie.description}\n\n` : "") +
    (movie.year ? `📅 Yil: ${movie.year}\n` : "") +
    (movie.language ? `🗣️ Til: ${movie.language.toUpperCase()}\n` : "") +
    (movie.category ? `🏷️ Janr: ${movie.category}\n` : "") +
    (movie.duration ? `⏱️ Davomiylik: ${movie.duration} daqiqa\n` : "") +
    `\n👁️ Ko'rishlar: ${movie.views}`;

  try {
    if (movie.thumbnail_url) {
      await bot.sendPhoto(chatId, movie.thumbnail_url, {
        caption: text,
        parse_mode: "HTML",
      });
    } else {
      await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    }

    // FIX #B8: sendVideo is called even if file_id is empty/null, causing an API error.
    // Guard with a check.
    if (movie.file_id) {
      await bot.sendVideo(chatId, movie.file_id, {
        caption: `📥 ${movie.title}`,
      });
    }

    await query("UPDATE movies SET views = views + 1 WHERE id = $1", [movie.id]);
  } catch (err) {
    console.error("Kino yuborishda xato:", err.message);
    await bot.sendMessage(chatId, `❌ Kinoni yuborishda xato yuz berdi: ${movie.title}`);
  }
}

async function handleTopMovies(msg) {
  const chatId = msg.chat.id;

  const movies = await query(
    "SELECT id, title, views, category FROM movies WHERE is_active = true ORDER BY views DESC LIMIT 10"
  );

  if (movies.rows.length === 0) {
    await bot.sendMessage(chatId, "📊 Hozircha kinolar mavjud emas.");
    return;
  }

  let text = "📊 <b>Top kinolar:</b>\n\n";
  movies.rows.forEach((m, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    text += `${medal} ${m.title} — ${m.views} marta ko'rildi\n`;
  });

  const keyboard = movies.rows.slice(0, 5).map(m => ([{
    text: `▶️ ${m.title}`,
    callback_data: `movie_${m.id}`
  }]));

  await bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard }
  });
}

async function handleReferral(msg) {
  const chatId = msg.chat.id;

  const user = await getOrCreateUser(msg);

  if (!user) {
    await bot.sendMessage(chatId, "Xato yuz berdi. Qaytadan urinib ko'ring.");
    return;
  }

  const botInfo = await bot.getMe();
  const referralLink = `https://t.me/${botInfo.username}?start=${user.referral_code}`;

  const referrals = await query(
    "SELECT COUNT(*) as count FROM bot_users WHERE referred_by = $1",
    [user.referral_code]
  );

  const text =
    `👥 <b>Referral tizimi</b>\n\n` +
    `Havolangiz:\n<code>${referralLink}</code>\n\n` +
    `📊 Takliflar: ${referrals.rows[0]?.count ?? 0} ta\n` +
    `🎁 Kodingiz: <code>${user.referral_code}</code>\n\n` +
    `Do'stlaringizni taklif qiling va bonuslar qozonig!`;

  await bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📤 Do'stlarga ulashish", switch_inline_query: `Kino botga qo'shiling: ${referralLink}` }
      ]]
    }
  });
}

async function handleHelp(msg) {
  const chatId = msg.chat.id;

  const text =
    `ℹ️ <b>Bot haqida</b>\n\n` +
    `🎬 Bu bot orqali siz:\n` +
    `• Kino qidirishingiz mumkin\n` +
    `• Top kinolarni ko'rishingiz mumkin\n` +
    `• Referral orqali do'stlarni taklif qilishingiz mumkin\n\n` +
    `📌 <b>Buyruqlar:</b>\n` +
    `/start - Botni boshlash\n` +
    `/search [nom] - Kino qidirish\n` +
    `/top - Top kinolar\n` +
    `/referral - Referral havola\n` +
    `/help - Yordam\n\n` +
    `💡 <b>Maslahat:</b> Kino nomini to'g'ridan-to'g'ri yozsangiz ham qidiruv ishlaydi!`;

  await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
}

// ─── Callback Query Handler ───────────────────────────────────────────────────

bot.on("callback_query", async (cbQuery) => {
  const chatId = cbQuery.message.chat.id;
  const telegramId = cbQuery.from.id;
  const data = cbQuery.data;

  // FIX #B9: Original code called bot.answerCallbackQuery(query.id) but `query`
  // is also the name of the DB query function. This shadowing causes a runtime error:
  // "query.id is not a property" or "query(...).answerCallbackQuery is not a function".
  // Renamed parameter to `cbQuery` to avoid the name collision.
  await bot.answerCallbackQuery(cbQuery.id);

  if (data === "check_subscription") {
    if (await checkChannelMembership(telegramId)) {
      await bot.sendMessage(chatId, "✅ A'zolik tasdiqlandi! Botdan foydalanishingiz mumkin.", buildMainKeyboard());
    } else {
      await bot.answerCallbackQuery(cbQuery.id, { text: "Hali a'zo bo'lmagansiz!", show_alert: true });
    }
    return;
  }

  if (data.startsWith("movie_")) {
    const movieId = parseInt(data.replace("movie_", ""), 10);
    // FIX #B10: Original called undefined function `query_db` which was defined AFTER
    // the callback handler — JavaScript hoisting works for function declarations but
    // not for async function expressions/arrow functions. Use the main `query` function
    // directly (the shadowing bug above has been fixed by renaming the parameter).
    const movie = await query("SELECT * FROM movies WHERE id = $1 AND is_active = true", [movieId]);

    if (movie.rows.length > 0) {
      await sendMovie(chatId, movie.rows[0]);
      await recordRequest(movieId, telegramId);
    } else {
      await bot.sendMessage(chatId, "❌ Kino topilmadi yoki o'chirilgan.");
    }
  }
});

// ─── Error Handler ────────────────────────────────────────────────────────────

bot.on("polling_error", (error) => {
  console.error("Polling xatosi:", error.message);
});

bot.on("error", (error) => {
  console.error("Bot xatosi:", error.message);
});

async function shutdown(signal) {
  console.log(`\n🛑 Bot to'xtatildi (${signal})`);
  bot.stopPolling();
  if (pool) await pool.end();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.log("✅ Bot muvaffaqiyatli ishga tushdi!");
console.log(`👤 Admin ID: ${ADMIN_ID}`);
