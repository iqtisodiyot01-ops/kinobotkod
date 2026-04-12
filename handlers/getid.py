from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command
from config import ADMIN_IDS

router = Router()


@router.message(Command("getid"))
async def getid_start(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        return
    await message.answer(
        "📹 Menga video yuboring — men sizga uning <b>File ID</b> sini qaytaraman.\n\n"
        "⚠️ Video <b>video sifatida</b> yuboring (fayl sifatida emas)",
        parse_mode="HTML"
    )


@router.message(F.video)
async def handle_video(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        return
    fid = message.video.file_id
    await message.answer(
        f"✅ <b>Video File ID:</b>\n\n<code>{fid}</code>\n\n"
        f"📋 Bu ID ni admin panelda 'Kino qo'shish' formasiga kiriting.",
        parse_mode="HTML"
    )


@router.message(F.document)
async def handle_document(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        return
    doc = message.document
    if doc.mime_type and doc.mime_type.startswith("video"):
        fid = doc.file_id
        await message.answer(
            f"✅ <b>Document File ID:</b>\n\n<code>{fid}</code>\n\n"
            f"⚠️ Bu fayl video emas, document sifatida yuborilgan.",
            parse_mode="HTML"
        )
