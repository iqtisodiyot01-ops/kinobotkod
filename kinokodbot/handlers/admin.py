import asyncio
from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from config import ADMIN_IDS
from database.movies import add_movie, delete_movie, list_movies
from database.channels import add_channel, delete_channel
from database.users import get_stats
from services.broadcast import run_broadcast

router = Router()
router.message.filter(F.from_user.id.in_(ADMIN_IDS))


class BroadcastState(StatesGroup):
    waiting_message = State()


class AddMovieState(StatesGroup):
    waiting_movie = State()



@router.message(Command("stats"))
async def cmd_stats(message: Message):
    s = get_stats()
    text = (
        f"📊 <b>Statistika</b>\n\n"
        f"👥 Foydalanuvchilar: <b>{s['users']}</b>\n"
        f"💎 Premium: <b>{s['premium']}</b>\n"
        f"🎬 Kinolar: <b>{s['movies']}</b>\n"
        f"📢 Kanallar: <b>{s['channels']}</b>"
    )
    await message.answer(text, parse_mode="HTML")


@router.message(Command("movies"))
async def cmd_list_movies(message: Message):
    movies = list_movies(limit=20)
    if not movies:
        await message.answer("Kinolar yo'q.")
        return
    lines = "\n".join([f"<code>{m['code']}</code> — {m['title']}" for m in movies])
    await message.answer(f"🎬 <b>Kinolar ro'yxati:</b>\n\n{lines}", parse_mode="HTML")


@router.message(Command("addmovie"))
async def cmd_add_movie(message: Message, state: FSMContext):
    args = message.text.split(maxsplit=1)
    if len(args) > 1:
        parts = args[1].split("|")
        if len(parts) >= 2:
            code, title = parts[0].strip(), parts[1].strip()
            file_id = parts[2].strip() if len(parts) > 2 else None
            if add_movie(code, title, file_id):
                await message.answer(f"✅ Kino qo'shildi: <code>{code}</code> — {title}", parse_mode="HTML")
            else:
                await message.answer("❌ Xatolik yuz berdi.")
            return
    await message.answer("📹 Video yuboring yoki:\n/addmovie <kod>|<nom>|<file_id>")
    await state.set_state(AddMovieState.waiting_movie)


@router.message(AddMovieState.waiting_movie, F.video)
async def receive_movie_video(message: Message, state: FSMContext):
    file_id = message.video.file_id
    caption = message.caption or ""
    parts = caption.split("|")
    if len(parts) >= 2:
        code, title = parts[0].strip(), parts[1].strip()
    else:
        await message.answer("❌ Caption: <kod>|<nom> formatida yozing")
        return
    if add_movie(code, title, file_id):
        await message.answer(f"✅ Kino qo'shildi: <code>{code}</code> — {title}", parse_mode="HTML")
    else:
        await message.answer("❌ Saqlashda xatolik.")
    await state.clear()


@router.message(Command("delmovie"))
async def cmd_del_movie(message: Message):
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer("Foydalanish: /delmovie <kod>")
        return
    code = args[1].strip()
    if delete_movie(code):
        await message.answer(f"🗑️ <code>{code}</code> o'chirildi.", parse_mode="HTML")
    else:
        await message.answer("❌ Xatolik.")


@router.message(Command("addchannel"))
async def cmd_add_channel(message: Message):
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer("Foydalanish: /addchannel <channel_id>|<nom>|<username>")
        return
    parts = args[1].split("|")
    if len(parts) < 2:
        await message.answer("Format: /addchannel -100xxx|Kanal nomi|username")
        return
    channel_id = parts[0].strip()
    title = parts[1].strip()
    username = parts[2].strip() if len(parts) > 2 else None
    if add_channel(channel_id, title, username):
        await message.answer(f"✅ Kanal qo'shildi: {title}")
    else:
        await message.answer("❌ Xatolik.")


@router.message(Command("delchannel"))
async def cmd_del_channel(message: Message):
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer("Foydalanish: /delchannel <channel_id>")
        return
    if delete_channel(args[1].strip()):
        await message.answer("✅ Kanal o'chirildi.")
    else:
        await message.answer("❌ Xatolik.")


@router.message(Command("broadcast"))
async def cmd_broadcast(message: Message, state: FSMContext):
    await message.answer("📢 Broadcast xabarini yuboring:")
    await state.set_state(BroadcastState.waiting_message)


@router.message(BroadcastState.waiting_message)
async def receive_broadcast(message: Message, bot: Bot, state: FSMContext):
    await state.clear()
    asyncio.create_task(run_broadcast(bot, message.text, message.from_user.id))
    await message.answer("🚀 Broadcast ishga tushdi! Natija yuboriladi.")


@router.message(Command("getid"))
async def cmd_getid(message: Message):
    await message.answer(
        "📹 <b>Video ID olish:</b>\n\n"
        "Faqat bu chatga video yuboring — men sizga darhol <code>file_id</code> qaytaraman.\n\n"
        "⚠️ <b>Video sifatida</b> yuboring (fayl/document emas)",
        parse_mode="HTML"
    )


@router.message(F.video)
async def any_video_get_id(message: Message, state: FSMContext):
    current_state = await state.get_state()
    if current_state == "AddMovieState:waiting_movie":
        return
    fid = message.video.file_id
    name = message.video.file_name or "—"
    await message.answer(
        f"✅ <b>Video File ID:</b>\n\n<code>{fid}</code>\n\n"
        f"📁 Fayl: {name}\n"
        f"📋 Bu ID ni admin panelda 'Kino qo'shish' → 'Telegram Video ID' ga kiriting.",
        parse_mode="HTML"
    )


@router.message(F.document)
async def any_document_get_id(message: Message):
    doc = message.document
    if doc.mime_type and doc.mime_type.startswith("video"):
        fid = doc.file_id
        await message.answer(
            f"⚠️ Bu <b>fayl</b> (document) sifatida yuborildi.\n\n"
            f"File ID: <code>{fid}</code>\n\n"
            f"<b>Eslatma:</b> Foydalanuvchiga video sifatida ko'rinishi uchun "
            f"'Send as video' bilan yuboring.",
            parse_mode="HTML"
        )
    else:
        fid = doc.file_id
        await message.answer(f"📎 Document File ID:\n\n<code>{fid}</code>", parse_mode="HTML")


@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext):
    current = await state.get_state()
    if current:
        await state.clear()
        await message.answer("✅ Bekor qilindi.")
    else:
        await message.answer("Hech narsa bajarilmayapti.")


@router.message(Command("help"))
async def cmd_admin_help(message: Message):
    text = (
        "🛠 <b>Admin buyruqlari:</b>\n\n"
        "/stats — statistika\n"
        "/movies — kinolar ro'yxati\n"
        "/addmovie <kod>|<nom> — kino qo'shish\n"
        "/delmovie <kod> — kino o'chirish\n"
        "/addchannel <id>|<nom>|<username> — kanal qo'shish\n"
        "/delchannel <id> — kanal o'chirish\n"
        "/broadcast — barcha foydalanuvchilarga xabar\n"
        "/getid — video file_id olish\n"
    )
    await message.answer(text, parse_mode="HTML")
