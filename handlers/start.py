from aiogram import Router, F, Bot
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
from database.users import set_user_language
from services.subscription import check_subscription, get_subscription_keyboard
from languages import get_text

router = Router()

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
async def cmd_start(message: Message, bot: Bot, lang: str, command=None):
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
