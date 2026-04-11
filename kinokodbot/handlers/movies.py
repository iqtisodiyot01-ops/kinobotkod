from aiogram import Router, F, Bot
from aiogram.types import Message
from database.movies import get_movie_by_code, search_movies
from database.users import check_premium, get_user_credits, use_credit
from services.subscription import check_subscription, get_subscription_keyboard
from languages import get_text

router = Router()


@router.message(F.text & ~F.text.startswith("/"))
async def handle_text(message: Message, bot: Bot, lang: str):
    text = message.text.strip()

    menu_btns = [
        "❓ Yordam", "❓ Помощь", "❓ Help",
        "📨 Admin bilan bog'lanish", "📨 Написать администратору", "📨 Contact Admin",
    ]
    if text in menu_btns:
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
    user_id = message.from_user.id

    if movie.get("is_paid"):
        if not check_premium(user_id):
            credits = get_user_credits(user_id)
            if credits <= 0:
                price = movie.get("price", 0)
                paid_msgs = {
                    "uz": (
                        f"💎 <b>Bu kino pullik!</b>\n\n"
                        f"🎬 <b>{movie['title']}</b>\n"
                        f"💰 Narxi: <b>{price:,} so'm</b>\n\n"
                        f"✅ Bepul ko'rish uchun do'stingizni botga taklif qiling!\n"
                        f"Har bir do'stingiz uchun 1 ta pulli kinoni bepul ko'rasiz.\n\n"
                        f"📌 Referral linkingizni olish uchun /referral yuboring"
                    ),
                    "ru": (
                        f"💎 <b>Этот фильм платный!</b>\n\n"
                        f"🎬 <b>{movie['title']}</b>\n"
                        f"💰 Цена: <b>{price:,} сум</b>\n\n"
                        f"✅ Пригласите друга — получите 1 бесплатный просмотр!\n\n"
                        f"📌 Ваша реферальная ссылка: /referral"
                    ),
                    "en": (
                        f"💎 <b>This movie is paid!</b>\n\n"
                        f"🎬 <b>{movie['title']}</b>\n"
                        f"💰 Price: <b>{price:,} UZS</b>\n\n"
                        f"✅ Invite a friend — get 1 free view!\n\n"
                        f"📌 Your referral link: /referral"
                    ),
                }
                await message.answer(paid_msgs.get(lang, paid_msgs["uz"]), parse_mode="HTML")
                return
            else:
                use_credit(user_id)
                remaining = credits - 1
                credit_msgs = {
                    "uz": f"✅ Referral kreditingizdan foydalanildi! Qolgan: {remaining} ta",
                    "ru": f"✅ Использован реферальный кредит! Осталось: {remaining}",
                    "en": f"✅ Referral credit used! Remaining: {remaining}",
                }
                await message.answer(credit_msgs.get(lang, credit_msgs["uz"]))

    caption = f"🎬 <b>{movie['title']}</b>\n🔑 Kod: <code>{movie['code']}</code>"
    if movie.get("description"):
        caption += f"\n\n📝 {movie['description']}"
    if movie.get("file_id"):
        try:
            await message.answer_video(video=movie["file_id"], caption=caption, parse_mode="HTML")
            return
        except Exception:
            pass
    await message.answer(caption, parse_mode="HTML")
