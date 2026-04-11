from aiogram import Router, F, Bot
from aiogram.filters import CommandStart
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
            [KeyboardButton(text=get_text(lang, "search_btn"))],
            [KeyboardButton(text=get_text(lang, "help_btn")), KeyboardButton(text=get_text(lang, "language_btn"))],
        ],
        resize_keyboard=True,
    )


@router.message(CommandStart())
async def cmd_start(message: Message, bot: Bot, lang: str, command=None):
    args = message.text.split()[1] if len(message.text.split()) > 1 else None
    referral_from = None
    if args and args.startswith("ref_"):
        try:
            referral_from = int(args[4:])
        except ValueError:
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


@router.callback_query(F.data == "check_sub")
async def check_sub_callback(call: CallbackQuery, bot: Bot, lang: str):
    not_subbed = await check_subscription(bot, call.from_user.id)
    if not_subbed:
        await call.answer(get_text(lang, "not_subscribed_yet"), show_alert=True)
        await call.message.edit_reply_markup(
            reply_markup=get_subscription_keyboard(not_subbed, lang)
        )
    else:
        await call.message.delete()
        await call.message.answer(
            get_text(lang, "welcome").format(name=call.from_user.first_name),
            reply_markup=main_menu(lang)
        )


@router.callback_query(F.data.startswith("lang_"))
async def select_language(call: CallbackQuery, lang: str):
    new_lang = call.data.split("_")[1]
    set_user_language(call.from_user.id, new_lang)
    await call.message.delete()
    await call.message.answer(
        get_text(new_lang, "language_changed"),
        reply_markup=main_menu(new_lang)
    )


@router.message(F.text.in_(["🌐 Til", "🌐 Язык", "🌐 Language"]))
async def change_language(message: Message, lang: str):
    await message.answer(get_text(lang, "choose_language"), reply_markup=LANG_KB)


@router.message(F.text.in_(["❓ Yordam", "❓ Помощь", "❓ Help"]))
async def help_handler(message: Message, lang: str):
    await message.answer(get_text(lang, "help_text"))
