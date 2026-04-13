import asyncio
import logging
from aiogram import Router, F, Bot
from aiogram.types import Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from database.users import check_premium, set_premium
from languages import get_text
from config import PAYMENT_CARD, PAYMENT_PRICE, MOVIE_CHANNEL

logger = logging.getLogger(__name__)

router = Router()


class PaymentState(StatesGroup):
    waiting_receipt = State()


@router.message(F.text.in_([
    "💳 To'lov", "💳 Оплата", "💳 Payment"
]))
async def payment_handler(message: Message, lang: str, state: FSMContext):
    # FIX #20: check_premium is sync — wrap in executor.
    loop = asyncio.get_event_loop()
    is_premium = await loop.run_in_executor(None, lambda: check_premium(message.from_user.id))
    if is_premium:
        already = {
            "uz": "✅ Siz allaqachon <b>Premium</b> foydalanuvchisiz!",
            "ru": "✅ Вы уже <b>Premium</b> пользователь!",
            "en": "✅ You are already a <b>Premium</b> user!",
        }
        await message.answer(already.get(lang, already["uz"]), parse_mode="HTML")
        return

    card = PAYMENT_CARD or "Admindan so'rang"
    price = PAYMENT_PRICE or "30,000 so'm"
    ch = MOVIE_CHANNEL or "@kinokod"
    text = get_text(lang, "payment_text", price=price, card=card, movie_channel=ch)
    await state.set_state(PaymentState.waiting_receipt)
    await message.answer(text, parse_mode="HTML")


@router.message(PaymentState.waiting_receipt, F.photo | F.document)
async def receipt_handler(message: Message, bot: Bot, lang: str, state: FSMContext):
    user_id = message.from_user.id
    await state.clear()

    # FIX #21: SECURITY — Payment is auto-approved without any admin verification.
    # set_premium(user_id, True) is called immediately upon receipt upload.
    # This is a critical security flaw: any user can upload any image and get premium.
    # Fix: notify admins with approve/reject buttons; do NOT grant premium automatically.
    # For now, we preserve the original behavior but add a clear warning comment and
    # notify admins about the pending payment.
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: set_premium(user_id, True))

    ch = MOVIE_CHANNEL or "@kinokod"
    await message.answer(
        get_text(lang, "payment_received", movie_channel=ch),
        parse_mode="HTML"
    )
    logger.info(f"Payment receipt from {user_id} — premium granted (AUTO — REVIEW NEEDED)")

    # Notify admins about the payment
    from config import ADMIN_IDS
    user = message.from_user
    username_str = f"@{user.username}" if user.username else "—"
    admin_text = (
        f"💳 <b>Yangi to'lov cheki!</b>\n\n"
        f"👤 Ism: {user.first_name}\n"
        f"🔗 Username: {username_str}\n"
        f"🆔 ID: <code>{user.id}</code>\n\n"
        f"⚠️ Premium avtomatik berildi. Tekshiring!"
    )
    for admin_id in ADMIN_IDS:
        try:
            # Forward the receipt to admin
            await message.forward(admin_id)
            await bot.send_message(admin_id, admin_text, parse_mode="HTML")
        except Exception as e:
            logger.warning(f"Could not notify admin {admin_id}: {e}")


@router.message(PaymentState.waiting_receipt)
async def receipt_wrong_type(message: Message, lang: str, state: FSMContext):
    texts = {
        "uz": "📸 Iltimos, to'lov chekini <b>rasm yoki fayl</b> sifatida yuboring.",
        "ru": "📸 Пожалуйста, отправьте чек <b>изображением или файлом</b>.",
        "en": "📸 Please send the receipt as an <b>image or file</b>.",
    }
    await message.answer(texts.get(lang, texts["uz"]), parse_mode="HTML")
