from aiogram import Router, F, Bot
from aiogram.types import Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from database.users import check_premium, set_premium
from languages import get_text
from config import PAYMENT_CARD, PAYMENT_PRICE, MOVIE_CHANNEL
import logging

logger = logging.getLogger(__name__)

router = Router()


class PaymentState(StatesGroup):
    waiting_receipt = State()


@router.message(F.text.in_([
    "💳 To'lov", "💳 Оплата", "💳 Payment"
]))
async def payment_handler(message: Message, lang: str, state: FSMContext):
    card = PAYMENT_CARD or "Noma'lum (admindan so'rang)"
    price = PAYMENT_PRICE or "30,000 so'm"
    ch = MOVIE_CHANNEL or "@kinokod"
    text = get_text(lang, "payment_text", price=price, card=card, movie_channel=ch)
    await state.set_state(PaymentState.waiting_receipt)
    await message.answer(text, parse_mode="HTML")


@router.message(PaymentState.waiting_receipt, F.photo | F.document)
async def receipt_handler(message: Message, bot: Bot, lang: str, state: FSMContext):
    user_id = message.from_user.id
    await state.clear()

    set_premium(user_id, True)

    ch = MOVIE_CHANNEL or "@kinokod"
    await message.answer(
        get_text(lang, "payment_received", movie_channel=ch),
        parse_mode="HTML"
    )
    logger.info(f"Payment receipt received from {user_id} — premium granted")
