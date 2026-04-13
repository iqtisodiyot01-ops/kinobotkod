import asyncio
from aiogram import Router, F, Bot
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
from database.users import set_user_language, register_referral, get_user_credits, check_premium
from services.subscription import check_subscription, get_subscription_keyboard
from languages import get_text
from config import BOT_USERNAME, MOVIE_CHANNEL
import logging

logger = logging.getLogger(__name__)

router = Router()

LANG_KB = InlineKeyboardMarkup(inline_keyboard=[
    [
        InlineKeyboardButton(text="🇺🇿 O'zbek", callback_data="lang_uz"),
        InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang_ru"),
        InlineKeyboardButton(text="🇬🇧 English", callback_data="lang_en"),
    ]
])


def main_menu(lang: str) -> ReplyKeyboardMarkup:
    btns = {
        "uz": [
            [KeyboardButton(text="❓ Yordam"), KeyboardButton(text="📨 Admin bilan bog'lanish")],
            [KeyboardButton(text="📊 Statusim"), KeyboardButton(text="🎟 Referral kreditim")],
            [KeyboardButton(text="💳 To'lov"), KeyboardButton(text="ℹ️ Bot haqida")],
        ],
        "ru": [
            [KeyboardButton(text="❓ Помощь"), KeyboardButton(text="📨 Написать администратору")],
            [KeyboardButton(text="📊 Мой статус"), KeyboardButton(text="🎟 Реф. кредиты")],
            [KeyboardButton(text="💳 Оплата"), KeyboardButton(text="ℹ️ О боте")],
        ],
        "en": [
            [KeyboardButton(text="❓ Help"), KeyboardButton(text="📨 Contact Admin")],
            [KeyboardButton(text="📊 My Status"), KeyboardButton(text="🎟 My Credits")],
            [KeyboardButton(text="💳 Payment"), KeyboardButton(text="ℹ️ About Bot")],
        ],
    }
    return ReplyKeyboardMarkup(keyboard=btns.get(lang, btns["uz"]), resize_keyboard=True)


def _ref_link(user_id: int) -> str:
    username = BOT_USERNAME
    if username:
        return f"https://t.me/{username}?start=ref_{user_id}"
    return f"https://t.me/bot?start=ref_{user_id}"


def _movie_channel() -> str:
    return MOVIE_CHANNEL or "@kinokod"


@router.message(CommandStart())
async def cmd_start(message: Message, bot: Bot, lang: str):
    text = message.text or ""
    parts = text.split(maxsplit=1)
    if len(parts) > 1:
        arg = parts[1].strip()
        if arg.startswith("ref_"):
            try:
                referrer_id = int(arg[4:])
                if referrer_id != message.from_user.id:
                    # FIX #14: register_referral is a sync Supabase call inside async handler.
                    loop = asyncio.get_event_loop()
                    new_credits = await loop.run_in_executor(
                        None, lambda: register_referral(referrer_id, message.from_user.id)
                    )
                    if new_credits > 0:
                        try:
                            referrer_lang = await loop.run_in_executor(
                                None, lambda: get_user_language_safe(referrer_id)
                            )
                        except Exception:
                            referrer_lang = "uz"
                        notify_text = get_text(
                            referrer_lang, "referral_join_notify",
                            name=message.from_user.full_name or message.from_user.first_name or "Foydalanuvchi",
                            credits=new_credits,
                            movie_channel=_movie_channel(),
                        )
                        try:
                            await bot.send_message(referrer_id, notify_text, parse_mode="HTML")
                        except Exception as e:
                            logger.warning(f"Could not notify referrer {referrer_id}: {e}")
            except Exception as e:
                logger.warning(f"Referral parse error: {e}")

    not_subbed = await check_subscription(bot, message.from_user.id)
    if not_subbed:
        await message.answer(
            get_text(lang, "subscribe_required"),
            reply_markup=get_subscription_keyboard(not_subbed, lang)
        )
        return

    # FIX #15: .format() on welcome string — first_name can be None for some
    # Telegram users (e.g. deleted accounts). Guard with empty string fallback.
    await message.answer(
        get_text(lang, "welcome").format(name=message.from_user.first_name or ""),
        reply_markup=main_menu(lang)
    )


def get_user_language_safe(user_id: int) -> str:
    from database.users import get_user_language
    return get_user_language(user_id) or "uz"


@router.callback_query(F.data == "check_sub")
async def check_sub_callback(call: CallbackQuery, bot: Bot, lang: str):
    not_subbed = await check_subscription(bot, call.from_user.id)
    if not_subbed:
        await call.answer(get_text(lang, "not_subscribed_yet"), show_alert=True)
        try:
            await call.message.edit_reply_markup(
                reply_markup=get_subscription_keyboard(not_subbed, lang)
            )
        except Exception:
            pass
    else:
        await call.answer()
        try:
            await call.message.delete()
        except Exception:
            pass
        hint = {
            "uz": "✅ Obuna tasdiqlandi!\n\nEndi kino kodi yoki nomini yuboring 🎬",
            "ru": "✅ Подписка подтверждена!\n\nТеперь отправьте код или название фильма 🎬",
            "en": "✅ Subscription confirmed!\n\nNow send a movie code or name 🎬",
        }
        await call.message.answer(hint.get(lang, hint["uz"]), reply_markup=main_menu(lang))


@router.callback_query(F.data.startswith("lang_"))
async def select_language(call: CallbackQuery, lang: str):
    new_lang = call.data.split("_")[1]
    # FIX #16: set_user_language is sync — wrap in executor.
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: set_user_language(call.from_user.id, new_lang))
    try:
        await call.message.delete()
    except Exception:
        pass
    await call.message.answer(get_text(new_lang, "language_changed"), reply_markup=main_menu(new_lang))


@router.message(Command("til", "lang", "language", "settings"))
async def settings_command(message: Message, lang: str):
    await message.answer(get_text(lang, "choose_language"), reply_markup=LANG_KB)


@router.message(F.text.in_(["❓ Yordam", "❓ Помощь", "❓ Help"]))
async def help_handler(message: Message, lang: str):
    await message.answer(get_text(lang, "help_text"), parse_mode="HTML", reply_markup=main_menu(lang))


@router.message(F.text.in_(["📊 Statusim", "📊 Мой статус", "📊 My Status"]))
async def status_handler(message: Message, lang: str):
    uid = message.from_user.id
    loop = asyncio.get_event_loop()
    is_prem = await loop.run_in_executor(None, lambda: check_premium(uid))
    credits = await loop.run_in_executor(None, lambda: get_user_credits(uid))
    ref_link = _ref_link(uid)
    status_label = (
        {"uz": "💎 Premium", "ru": "💎 Премиум", "en": "💎 Premium"}.get(lang, "💎 Premium")
        if is_prem else
        {"uz": "❌ Oddiy", "ru": "❌ Обычный", "en": "❌ Regular"}.get(lang, "❌ Regular")
    )
    texts = {
        "uz": f"📊 <b>Sizning statusingiz:</b>\n\n🏷 Tarifingiz: <b>{status_label}</b>\n🎟 Kreditlaringiz: <b>{credits}</b>\n\n🔗 Referral havolangiz:\n<code>{ref_link}</code>",
        "ru": f"📊 <b>Ваш статус:</b>\n\n🏷 Тариф: <b>{status_label}</b>\n🎟 Кредиты: <b>{credits}</b>\n\n🔗 Реферальная ссылка:\n<code>{ref_link}</code>",
        "en": f"📊 <b>Your Status:</b>\n\n🏷 Plan: <b>{status_label}</b>\n🎟 Credits: <b>{credits}</b>\n\n🔗 Referral link:\n<code>{ref_link}</code>",
    }
    await message.answer(texts.get(lang, texts["uz"]), parse_mode="HTML")


@router.message(F.text.in_(["🎟 Referral kreditim", "🎟 Реф. кредиты", "🎟 My Credits"]))
async def referral_handler(message: Message, lang: str):
    uid = message.from_user.id
    loop = asyncio.get_event_loop()
    credits = await loop.run_in_executor(None, lambda: get_user_credits(uid))
    ref_link = _ref_link(uid)
    texts = {
        "uz": f"🎟 <b>Referral kreditlaringiz:</b> <b>{credits}</b>\n\n🔗 Do'stlaringizga yuboring:\n<code>{ref_link}</code>\n\n✅ Har bir do'st qo'shilganda 1 kredit olasiz!",
        "ru": f"🎟 <b>Ваши реферальные кредиты:</b> <b>{credits}</b>\n\n🔗 Ссылка для приглашения:\n<code>{ref_link}</code>\n\n✅ За каждого друга — 1 кредит!",
        "en": f"🎟 <b>Your referral credits:</b> <b>{credits}</b>\n\n🔗 Invite link:\n<code>{ref_link}</code>\n\n✅ Get 1 credit for each friend!",
    }
    await message.answer(texts.get(lang, texts["uz"]), parse_mode="HTML")


@router.message(F.text.in_(["ℹ️ Bot haqida", "ℹ️ О боте", "ℹ️ About Bot"]))
async def about_handler(message: Message, lang: str):
    await message.answer(get_text(lang, "about_text"), parse_mode="HTML")
