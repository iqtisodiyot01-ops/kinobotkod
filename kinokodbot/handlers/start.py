import os
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

_STATUS_LABELS = {"uz": "✅ Premium", "ru": "✅ Премиум", "en": "✅ Premium"}
_FREE_LABELS   = {"uz": "❌ Oddiy",   "ru": "❌ Обычный", "en": "❌ Regular"}


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
                    new_credits = register_referral(referrer_id, message.from_user.id)
                    if new_credits > 0:
                        referrer_lang = lang
                        try:
                            from database.users import get_user_language
                            referrer_lang = get_user_language(referrer_id) or "uz"
                        except Exception:
                            pass
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
            except (ValueError, Exception) as e:
                logger.warning(f"Referral parse error: {e}")

    not_subbed = await check_subscription(bot, message.from_user.id)
    if not_subbed:
        await message.answer(
            get_text(lang, "subscribe_required"),
            reply_markup=get_subscription_keyboard(not_subbed, lang)
        )
        return

    await message.answer(
        get_text(lang, "welcome").format(name=message.from_user.first_name),
        reply_markup=main_menu(lang)
    )


@router.message(Command("referral", "ref"))
@router.message(F.text.in_(["🎟 Referral kreditim", "🎟 Реф. кредиты", "🎟 My Credits"]))
async def referral_command(message: Message, lang: str):
    user_id = message.from_user.id
    credits = get_user_credits(user_id)
    link = _ref_link(user_id)
    await message.answer(
        get_text(lang, "credits_text", credits=credits, link=link),
        parse_mode="HTML"
    )


@router.message(F.text.in_(["📊 Statusim", "📊 Мой статус", "📊 My Status"]))
async def status_handler(message: Message, lang: str):
    user_id = message.from_user.id
    is_premium = check_premium(user_id)
    credits = get_user_credits(user_id)
    premium_label = _STATUS_LABELS.get(lang, "✅ Premium") if is_premium else _FREE_LABELS.get(lang, "❌ Oddiy")
    await message.answer(
        get_text(lang, "status_text",
                 name=message.from_user.full_name or "—",
                 uid=user_id,
                 premium=premium_label,
                 credits=credits),
        parse_mode="HTML"
    )


@router.message(F.text.in_(["ℹ️ Bot haqida", "ℹ️ О боте", "ℹ️ About Bot"]))
async def about_handler(message: Message, lang: str):
    await message.answer(get_text(lang, "about_text"), parse_mode="HTML")


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
        send_movie_hint = {
            "uz": "✅ Obuna tasdiqlandi!\n\nEndi kino kodi yoki nomini yuboring 🎬",
            "ru": "✅ Подписка подтверждена!\n\nТеперь отправьте код или название фильма 🎬",
            "en": "✅ Subscription confirmed!\n\nNow send a movie code or name 🎬",
        }
        await call.message.answer(
            send_movie_hint.get(lang, send_movie_hint["uz"]),
            reply_markup=main_menu(lang)
        )


@router.callback_query(F.data.startswith("lang_"))
async def select_language(call: CallbackQuery, lang: str):
    new_lang = call.data.split("_")[1]
    set_user_language(call.from_user.id, new_lang)
    try:
        await call.message.delete()
    except Exception:
        pass
    await call.message.answer(
        get_text(new_lang, "language_changed"),
        reply_markup=main_menu(new_lang)
    )


@router.message(Command("til", "lang", "language", "settings"))
async def settings_command(message: Message, lang: str):
    await message.answer(get_text(lang, "choose_language"), reply_markup=LANG_KB)


@router.message(F.text.in_(["❓ Yordam", "❓ Помощь", "❓ Help"]))
async def help_handler(message: Message, lang: str):
    await message.answer(get_text(lang, "help_text"), parse_mode="HTML", reply_markup=main_menu(lang))
