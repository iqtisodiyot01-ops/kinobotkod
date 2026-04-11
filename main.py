import logging
import asyncio
import os
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.types import (
    Message, CallbackQuery,
    InlineKeyboardButton, InlineKeyboardMarkup,
)
from config import ADMIN_IDS, BOT_TOKEN
import db
from languages import t

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


def is_admin(user_id: int) -> bool:
    return int(user_id) in ADMIN_IDS


# ─── Helpers ──────────────────────────────────────────────────────────────────

def lang_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🇺🇿 O'zbek", callback_data="lang_uz"),
        InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang_ru"),
        InlineKeyboardButton(text="🇬🇧 English", callback_data="lang_en"),
    ]])


async def subscription_keyboard(lang: str) -> InlineKeyboardMarkup:
    channels = await db.get_all_channels()
    buttons = []
    for ch in channels:
        url = ch.get("chat_url") or f"https://t.me/{ch['username'].lstrip('@')}"
        buttons.append([InlineKeyboardButton(text=t(lang, "sub_button") + f" {ch['username']}", url=url)])
    buttons.append([InlineKeyboardButton(text=t(lang, "sub_done"), callback_data="check_sub")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


async def is_subscribed(user_id: int) -> bool:
    channels = await db.get_all_channels()
    if not channels:
        return True
    for ch in channels:
        try:
            member = await bot.get_chat_member(chat_id=ch["username"], user_id=user_id)
            if member.status not in ("member", "administrator", "creator"):
                return False
        except Exception:
            return False
    return True


# ─── /start ───────────────────────────────────────────────────────────────────

@dp.message(Command("start"))
async def cmd_start(message: Message):
    await db.register_user(message.from_user.id)
    await message.answer(
        t("uz", "choose_lang"),
        reply_markup=lang_keyboard(),
    )


# ─── Language callbacks ────────────────────────────────────────────────────────

@dp.callback_query(F.data.startswith("lang_"))
async def set_lang(call: CallbackQuery):
    lang = call.data.split("_")[1]
    await db.set_user_lang(call.from_user.id, lang)

    subscribed = await is_subscribed(call.from_user.id)
    if subscribed:
        await call.message.edit_text(t(lang, "welcome"))
    else:
        kb = await subscription_keyboard(lang)
        await call.message.edit_text(t(lang, "sub_required"), reply_markup=kb)
    await call.answer()


# ─── Subscription check callback ──────────────────────────────────────────────

@dp.callback_query(F.data == "check_sub")
async def check_sub_callback(call: CallbackQuery):
    lang = await db.get_user_lang(call.from_user.id)
    subscribed = await is_subscribed(call.from_user.id)
    if subscribed:
        await call.message.edit_text(t(lang, "sub_success"))
    else:
        kb = await subscription_keyboard(lang)
        await call.message.edit_text(t(lang, "sub_check_fail"), reply_markup=kb)
    await call.answer()


# ─── /lang – change language ──────────────────────────────────────────────────

@dp.message(Command("lang"))
async def cmd_lang(message: Message):
    await message.answer(t("uz", "choose_lang"), reply_markup=lang_keyboard())


# ─── /help ────────────────────────────────────────────────────────────────────

@dp.message(Command("help"))
async def cmd_help(message: Message):
    lang = await db.get_user_lang(message.from_user.id)
    await message.answer(t(lang, "help"), parse_mode="Markdown")


# ─── Admin commands ───────────────────────────────────────────────────────────

@dp.message(Command("addmovie"))
async def add_movie(message: Message):
    if not is_admin(message.from_user.id):
        await message.answer("🚫 Sizda bu buyruqdan foydalanish huquqi yo'q!")
        return
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer("❌ Format: `/addmovie <kod>` yoki `/addmovie <kod>|<sarlavha>`", parse_mode="Markdown")
        return
    parts = args[1].split("|", 1)
    code = parts[0].strip()
    title = parts[1].strip() if len(parts) > 1 else None
    ok = await db.add_movie(code, title=title)
    if ok:
        await message.answer(f"✅ Kino qo'shildi: `{code}`" + (f" — {title}" if title else ""), parse_mode="Markdown")
    else:
        await message.answer(f"⚠️ Bu kod allaqachon mavjud: `{code}`", parse_mode="Markdown")


@dp.message(Command("removemovie"))
async def remove_movie(message: Message):
    if not is_admin(message.from_user.id):
        await message.answer("🚫 Sizda bu buyruqdan foydalanish huquqi yo'q!")
        return
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer("❌ Format: `/removemovie <kod>`", parse_mode="Markdown")
        return
    code = args[1].strip()
    ok = await db.remove_movie(code)
    if ok:
        await message.answer(f"🗑 Kino o'chirildi: `{code}`", parse_mode="Markdown")
    else:
        await message.answer(f"⚠️ Bunday kod topilmadi: `{code}`", parse_mode="Markdown")


@dp.message(Command("kinolar"))
async def list_movies(message: Message):
    if not is_admin(message.from_user.id):
        await message.answer("🚫 Bu buyruq faqat adminlar uchun!")
        return
    movies = await db.get_all_movies()
    if not movies:
        await message.answer("🎥 Kino bazasi bo'sh!")
        return
    lines = [f"🎬 `{m['code']}`" + (f" — {m['title']}" if m.get('title') else "") for m in movies]
    await message.answer("🎥 Kinolar ro'yxati:\n\n" + "\n".join(lines), parse_mode="Markdown")


@dp.message(Command("addchannel"))
async def add_channel(message: Message):
    if not is_admin(message.from_user.id):
        await message.answer("🚫 Sizda bu buyruqdan foydalanish huquqi yo'q!")
        return
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer("❌ Format: `/addchannel @username` yoki `/addchannel @username|https://t.me/...`", parse_mode="Markdown")
        return
    parts = args[1].split("|", 1)
    username = parts[0].strip()
    url = parts[1].strip() if len(parts) > 1 else None
    ok = await db.add_channel(username, chat_url=url)
    if ok:
        await message.answer(f"✅ Kanal qo'shildi: `{username}`", parse_mode="Markdown")
    else:
        await message.answer(f"⚠️ Bu kanal allaqachon mavjud: `{username}`", parse_mode="Markdown")


@dp.message(Command("removechannel"))
async def remove_channel(message: Message):
    if not is_admin(message.from_user.id):
        await message.answer("🚫 Sizda bu buyruqdan foydalanish huquqi yo'q!")
        return
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer("❌ Format: `/removechannel @username`", parse_mode="Markdown")
        return
    username = args[1].strip()
    ok = await db.remove_channel(username)
    if ok:
        await message.answer(f"❌ Kanal o'chirildi: `{username}`", parse_mode="Markdown")
    else:
        await message.answer(f"⚠️ Bunday kanal topilmadi: `{username}`", parse_mode="Markdown")


@dp.message(Command("channels"))
async def channels_list(message: Message):
    if not is_admin(message.from_user.id):
        await message.answer("🚫 Bu buyruq faqat adminlar uchun!")
        return
    channels = await db.get_all_channels()
    if not channels:
        await message.answer("📂 Kanal bazasi bo'sh!")
        return
    lines = [f"📡 {ch['username']}" + (f" — {ch['chat_url']}" if ch.get('chat_url') else "") for ch in channels]
    await message.answer("📜 Kanallar:\n\n" + "\n".join(lines))


@dp.message(Command("stats"))
async def stats(message: Message):
    movies_count = await db.count_movies()
    channels_count = await db.count_channels()
    users_count = await db.count_users()
    await message.answer(
        f"📊 Statistika:\n"
        f"🎥 Kinolar: {movies_count}\n"
        f"📡 Kanallar: {channels_count}\n"
        f"👥 Foydalanuvchilar: {users_count}"
    )


@dp.message(Command("members"))
async def members_count(message: Message):
    if not is_admin(message.from_user.id):
        await message.answer("🚫 Bu buyruq faqat adminlar uchun!")
        return
    count = await db.count_users()
    await message.answer(f"👥 Jami foydalanuvchilar: {count}")


@dp.message(Command("broadcast"))
async def broadcast(message: Message):
    if not is_admin(message.from_user.id):
        await message.answer("🚫 Bu buyruq faqat adminlar uchun!")
        return
    lang = await db.get_user_lang(message.from_user.id)
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer(t(lang, "broadcast_usage"), parse_mode="Markdown")
        return
    text = args[1]
    user_ids = await db.get_all_user_ids()
    sent = 0
    for uid in user_ids:
        try:
            await bot.send_message(uid, text)
            sent += 1
        except Exception:
            pass
    await message.answer(t(lang, "broadcast_done").format(count=sent))


# ─── Admin: add movie via video ───────────────────────────────────────────────

@dp.message(F.video | F.document)
async def handle_video(message: Message):
    if not is_admin(message.from_user.id):
        return
    caption = message.caption or ""
    if not caption.startswith("/addmovie"):
        await message.answer(
            "ℹ️ Video qabul qilindi. Uni kino sifatida qo'shish uchun:\n"
            "Caption'ga `/addmovie <kod>` yoki `/addmovie <kod>|<sarlavha>` yozing.",
            parse_mode="Markdown",
        )
        return
    parts_cmd = caption.split(maxsplit=1)
    if len(parts_cmd) < 2:
        await message.answer("❌ Format: `/addmovie <kod>` yoki `/addmovie <kod>|<sarlavha>`", parse_mode="Markdown")
        return
    parts = parts_cmd[1].split("|", 1)
    code = parts[0].strip()
    title = parts[1].strip() if len(parts) > 1 else None
    file_id = message.video.file_id if message.video else message.document.file_id
    ok = await db.add_movie(code, file_id=file_id, title=title)
    if ok:
        await message.answer(
            f"✅ Kino qo'shildi!\n🔑 Kod: `{code}`" + (f"\n🎬 Sarlavha: {title}" if title else ""),
            parse_mode="Markdown",
        )
    else:
        await message.answer(f"⚠️ Bu kod allaqachon mavjud: `{code}`", parse_mode="Markdown")


# ─── Movie search (all text messages) ────────────────────────────────────────

@dp.message(F.text)
async def search_movie(message: Message):
    user_id = message.from_user.id
    await db.register_user(user_id)
    lang = await db.get_user_lang(user_id)

    # Check subscription first
    subscribed = await is_subscribed(user_id)
    if not subscribed:
        kb = await subscription_keyboard(lang)
        await message.answer(t(lang, "sub_required"), reply_markup=kb)
        return

    query = message.text.strip()

    # Try exact code match first
    movie = await db.get_movie(query)
    if movie:
        if movie.get("file_id"):
            await message.answer_video(movie["file_id"], caption=f"🎬 {movie.get('title') or query}")
        else:
            title_info = f"\n🎬 Sarlavha: {movie['title']}" if movie.get('title') else ""
            await message.answer(f"✅ Kino topildi!\n🔑 Kod: `{movie['code']}`{title_info}", parse_mode="Markdown")
        return

    # Try title search
    results = await db.search_movies_by_title(query)
    if results:
        lines = [f"🎬 Kod: `{m['code']}`" + (f" — {m['title']}" if m.get('title') else "") for m in results]
        await message.answer("🔍 Topildi:\n\n" + "\n".join(lines), parse_mode="Markdown")
        return

    await message.answer(t(lang, "not_found"))


# ─── Main ─────────────────────────────────────────────────────────────────────

async def main():
    logging.basicConfig(level=logging.INFO)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
