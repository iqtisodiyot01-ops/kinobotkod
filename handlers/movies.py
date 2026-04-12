from aiogram import Router, F, Bot
from aiogram.types import Message
from database.movies import get_movie_by_code, search_movies
from services.subscription import check_subscription, get_subscription_keyboard
from languages import get_text

router = Router()

MENU_BUTTONS = {
    "❓ Yordam", "❓ Помощь", "❓ Help",
    "📨 Admin bilan bog'lanish", "📨 Написать администратору", "📨 Contact Admin",
    "📊 Statusim", "📊 Мой статус", "📊 My Status",
    "🎟 Referral kreditim", "🎟 Реф. кредиты", "🎟 My Credits",
    "💳 To'lov", "💳 Оплата", "💳 Payment",
    "ℹ️ Bot haqida", "ℹ️ О боте", "ℹ️ About Bot",
}


@router.message(F.text & ~F.text.startswith("/"))
async def handle_text(message: Message, bot: Bot, lang: str):
    text = message.text.strip()

    if text in MENU_BUTTONS:
        return

    not_subbed = await check_subscription(bot, message.from_user.id)
    if not_subbed:
        await message.answer(
            get_text(lang, "subscribe_required"),
            reply_markup=get_subscription_keyboard(not_subbed, lang)
        )
        return

    movie = get_movie_by_code(text)
    if movie:
        await send_movie(message, movie, lang)
        return

    results = search_movies(text)
    if results:
        if len(results) == 1:
            movie = get_movie_by_code(results[0]["code"])
            if movie:
                await send_movie(message, movie, lang)
                return
        lines = "\n".join([f"🎬 <b>{m['title']}</b> — kod: <code>{m['code']}</code>" for m in results])
        await message.answer(get_text(lang, "search_results").format(results=lines), parse_mode="HTML")
    else:
        await message.answer(get_text(lang, "movie_not_found"))


async def send_movie(message: Message, movie: dict, lang: str):
    caption = f"🎬 <b>{movie['title']}</b>\n🔑 Kod: <code>{movie['code']}</code>"
    if movie.get("file_id"):
        try:
            await message.answer_video(video=movie["file_id"], caption=caption, parse_mode="HTML")
            return
        except Exception:
            pass
    await message.answer(caption, parse_mode="HTML")
