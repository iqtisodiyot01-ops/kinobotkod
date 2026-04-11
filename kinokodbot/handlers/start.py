import os
from aiogram import Router, F, Bot
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
from database.users import set_user_language, register_referral, get_user_credits
from services.subscription import check_subscription, get_subscription_keyboard
from languages import get_text

router = Router()

BOT_USERNAME = os.getenv("BOT_USERNAME", "")

LANG_KB = InlineKeyboardMarkup(inline_keyboard=[
    [
        InlineKeyboardButton(text="🇺🇿 O'zbek", callback_data="lang_uz"),
        InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang_ru"),
        InlineKeyboardButton(text="🇬🇧 English", callback_data="lang_en"),
    ]
])


def main_menu(lang: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=get_text(lang, "help_btn"))],
            [KeyboardButton(text=get_text(lang, "support_btn"))],
        ],
        resize_keyboard=True,
    )


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
                    register_referral(referrer_id, message.from_user.id)
            except (ValueError, Exception):
                pass

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
async def referral_command(message: Message, lang: str):
    user_id = message.from_user.id
    credits = get_user_credits(user_id)

    if BOT_USERNAME:
        link = f"https://t.me/{BOT_USERNAME}?start=ref_{user_id}"
    else:
        link = f"https://t.me/bot?start=ref_{user_id}"

    ref_msgs = {
        "uz": (
            f"🔗 <b>Sizning referral linkingiz:</b>\n\n"
            f"<code>{link}</code>\n\n"
            f"👥 Do'stingiz shu link orqali botga kirsa, siz <b>1 ta pulli kinoni bepul</b> ko'ra olasiz!\n\n"
            f"🎟 Hozirgi kreditlaringiz: <b>{credits} ta</b>"
        ),
        "ru": (
            f"🔗 <b>Ваша реферальная ссылка:</b>\n\n"
            f"<code>{link}</code>\n\n"
            f"👥 Когда друг зайдёт по этой ссылке, вы получите <b>1 бесплатный просмотр</b> платного фильма!\n\n"
            f"🎟 Текущие кредиты: <b>{credits}</b>"
        ),
        "en": (
            f"🔗 <b>Your referral link:</b>\n\n"
            f"<code>{link}</code>\n\n"
            f"👥 When a friend joins via this link, you get <b>1 free paid movie view</b>!\n\n"
            f"🎟 Current credits: <b>{credits}</b>"
        ),
    }
    await message.answer(ref_msgs.get(lang, ref_msgs["uz"]), parse_mode="HTML")


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
