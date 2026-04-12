from aiogram import Router, F, Bot
from aiogram.types import Message
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from config import ADMIN_IDS

router = Router()


class GetIdState(StatesGroup):
    waiting_video = State()


@router.message(Command("getid"))
async def getid_start(message: Message, state: FSMContext):
    if message.from_user.id not in ADMIN_IDS:
        return
    await state.set_state(GetIdState.waiting_video)
    await message.answer(
        "📹 Menga video yuboring — men sizga uning <b>File ID</b> sini qaytaraman.\n\n"
        "⚠️ Video <b>video sifatida</b> yuboring (fayl sifatida emas)\n\n"
        "❌ Bekor qilish uchun /cancel yozing",
        parse_mode="HTML"
    )


@router.message(GetIdState.waiting_video, F.video)
async def handle_video(message: Message, state: FSMContext):
    await state.clear()
    fid = message.video.file_id
    await message.answer(
        f"✅ <b>Video File ID:</b>\n\n<code>{fid}</code>\n\n"
        f"📋 Bu ID ni admin panelda 'Kino qo'shish' formasiga kiriting.",
        parse_mode="HTML"
    )


@router.message(GetIdState.waiting_video, F.document)
async def handle_document(message: Message, state: FSMContext):
    await state.clear()
    doc = message.document
    if doc.mime_type and doc.mime_type.startswith("video"):
        fid = doc.file_id
        await message.answer(
            f"✅ <b>Document File ID:</b>\n\n<code>{fid}</code>\n\n"
            f"⚠️ Fayl video emas, document sifatida yuborilgan.",
            parse_mode="HTML"
        )
    else:
        await message.answer("❌ Bu video fayl emas. Video yuboring.")


@router.message(GetIdState.waiting_video, Command("cancel"))
async def cancel_getid(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("❌ Bekor qilindi.")


@router.message(GetIdState.waiting_video)
async def getid_wrong_type(message: Message):
    await message.answer("📹 Iltimos video yuboring. Bekor qilish: /cancel")
