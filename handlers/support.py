import asyncio
from aiogram import Router, F, Bot
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from config import ADMIN_IDS
from database.support import save_support_message
from languages import get_text

router = Router()


class SupportState(StatesGroup):
    waiting_message = State()


SUPPORT_BTN = {
    "uz": "📨 Admin bilan bog'lanish",
    "ru": "📨 Написать администратору",
    "en": "📨 Contact Admin",
}

CANCEL_BTN = {
    "uz": "❌ Bekor qilish",
    "ru": "❌ Отмена",
    "en": "❌ Cancel",
}


def cancel_kb(lang: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=CANCEL_BTN.get(lang, "❌ Bekor qilish"))]],
        resize_keyboard=True,
    )


@router.message(F.text.in_(list(SUPPORT_BTN.values())))
async def support_start(message: Message, state: FSMContext, lang: str):
    await state.set_state(SupportState.waiting_message)
    texts = {
        "uz": "✍️ Adminga yuboriladigan xabaringizni yozing:\n\n(Bekor qilish uchun ❌ Bekor qilish tugmasini bosing)",
        "ru": "✍️ Напишите ваше сообщение администратору:\n\n(Нажмите ❌ Отмена для отмены)",
        "en": "✍️ Write your message to admin:\n\n(Press ❌ Cancel to cancel)",
    }
    await message.answer(texts.get(lang, texts["uz"]), reply_markup=cancel_kb(lang))


@router.message(SupportState.waiting_message)
async def support_receive(message: Message, state: FSMContext, lang: str, bot: Bot):
    cancel_texts = list(CANCEL_BTN.values())
    if message.text in cancel_texts:
        await state.clear()
        from handlers.start import main_menu
        texts = {
            "uz": "❌ Bekor qilindi.",
            "ru": "❌ Отменено.",
            "en": "❌ Cancelled.",
        }
        await message.answer(texts.get(lang, texts["uz"]), reply_markup=main_menu(lang))
        return

    # FIX #19: save_support_message is sync — wrap in executor.
    user = message.from_user
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: save_support_message(
            telegram_id=user.id,
            username=user.username or "",
            first_name=user.first_name or "",
            message=message.text or ""
        )
    )

    success_texts = {
        "uz": "✅ Xabaringiz adminga yuborildi! Tez orada javob beramiz.",
        "ru": "✅ Ваше сообщение отправлено администратору! Ответим в ближайшее время.",
        "en": "✅ Your message has been sent to admin! We will reply soon.",
    }

    from handlers.start import main_menu
    await message.answer(success_texts.get(lang, success_texts["uz"]), reply_markup=main_menu(lang))
    await state.clear()

    username_str = f"@{user.username}" if user.username else "—"
    admin_text = (
        f"📨 <b>Yangi foydalanuvchi xabari</b>\n\n"
        f"👤 Ism: {user.first_name}\n"
        f"🔗 Username: {username_str}\n"
        f"🆔 ID: <code>{user.id}</code>\n\n"
        f"💬 Xabar:\n{message.text}"
    )

    for admin_id in ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text, parse_mode="HTML")
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Admin {admin_id} ga xabar yuborishda xato: {e}")
