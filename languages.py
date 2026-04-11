TEXTS = {
    "uz": {
        "choose_lang": "🌐 Tilni tanlang:",
        "choose_language": "🌐 Tilni tanlang:",
        "language_changed": "✅ Til o'zgartirildi: O'zbekcha 🇺🇿",
        "lang_changed": "✅ Til o'zgartirildi: O'zbekcha 🇺🇿",
        "welcome": "🎬 Salom, {name}!\n\nKino kodini yoki nomini yuboring — biz tez topib beramiz! 🍿",
        "subscribe_required": "🔒 Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:",
        "sub_required": "🔒 Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:",
        "not_subscribed_yet": "❌ Siz hali barcha kanallarga obuna bo'lmagansiz!",
        "sub_check_fail": "❌ Siz hali barcha kanallarga obuna bo'lmagansiz!",
        "sub_success": "✅ Rahmat! Endi botdan foydalanishingiz mumkin.",
        "movie_not_found": "😔 Bunday kino topilmadi. Boshqa nom yoki kod bilan urinib ko'ring.",
        "not_found": "😔 Bunday kino topilmadi. Boshqa nom yoki kod bilan urinib ko'ring.",
        "search_results": "🔎 Qidiruv natijalari:\n\n{results}\n\nKodni yuboring!",
        "search_btn": "🔍 Qidirish",
        "help_btn": "❓ Yordam",
        "language_btn": "🌐 Til",
        "help_text": (
            "🆘 <b>Yordam</b>\n\n"
            "🎬 Kino topish uchun:\n"
            "  • Kino kodini yuboring (masalan: <code>101</code>)\n"
            "  • Yoki kino nomini yozing\n\n"
            "⚙️ Buyruqlar:\n"
            "  /start — Botni qayta ishga tushirish\n"
            "  /help — Yordam\n"
        ),
        "broadcast_usage": "❌ Format: /broadcast <xabar>",
        "broadcast_done": "✅ Xabar {count} ta foydalanuvchiga yuborildi.",
    },
    "ru": {
        "choose_lang": "🌐 Выберите язык:",
        "choose_language": "🌐 Выберите язык:",
        "language_changed": "✅ Язык изменён: Русский 🇷🇺",
        "lang_changed": "✅ Язык изменён: Русский 🇷🇺",
        "welcome": "🎬 Привет, {name}!\n\nОтправьте код или название фильма — найдём! 🍿",
        "subscribe_required": "🔒 Чтобы использовать бота, подпишитесь на каналы:",
        "sub_required": "🔒 Чтобы использовать бота, подпишитесь на каналы:",
        "not_subscribed_yet": "❌ Вы ещё не подписались на все каналы!",
        "sub_check_fail": "❌ Вы ещё не подписались на все каналы!",
        "sub_success": "✅ Спасибо! Теперь вы можете пользоваться ботом.",
        "movie_not_found": "😔 Фильм не найден. Попробуйте другое название или код.",
        "not_found": "😔 Фильм не найден. Попробуйте другое название или код.",
        "search_results": "🔎 Результаты поиска:\n\n{results}\n\nОтправьте код!",
        "search_btn": "🔍 Поиск",
        "help_btn": "❓ Помощь",
        "language_btn": "🌐 Язык",
        "help_text": (
            "🆘 <b>Помощь</b>\n\n"
            "🎬 Чтобы найти фильм:\n"
            "  • Отправьте код фильма (например: <code>101</code>)\n"
            "  • Или напишите название\n\n"
            "⚙️ Команды:\n"
            "  /start — Перезапустить бота\n"
            "  /help — Помощь\n"
        ),
        "broadcast_usage": "❌ Формат: /broadcast <сообщение>",
        "broadcast_done": "✅ Сообщение отправлено {count} пользователям.",
    },
    "en": {
        "choose_lang": "🌐 Choose language:",
        "choose_language": "🌐 Choose language:",
        "language_changed": "✅ Language changed: English 🇬🇧",
        "lang_changed": "✅ Language changed: English 🇬🇧",
        "welcome": "🎬 Hello, {name}!\n\nSend a movie code or name — we'll find it! 🍿",
        "subscribe_required": "🔒 Please subscribe to our channels to use the bot:",
        "sub_required": "🔒 Please subscribe to our channels to use the bot:",
        "not_subscribed_yet": "❌ You haven't subscribed to all channels yet!",
        "sub_check_fail": "❌ You haven't subscribed to all channels yet!",
        "sub_success": "✅ Thank you! Now you can use the bot.",
        "movie_not_found": "😔 Movie not found. Try another name or code.",
        "not_found": "😔 Movie not found. Try another name or code.",
        "search_results": "🔎 Search results:\n\n{results}\n\nSend the code!",
        "search_btn": "🔍 Search",
        "help_btn": "❓ Help",
        "language_btn": "🌐 Language",
        "help_text": (
            "🆘 <b>Help</b>\n\n"
            "🎬 To find a movie:\n"
            "  • Send a movie code (e.g. <code>101</code>)\n"
            "  • Or type the movie name\n\n"
            "⚙️ Commands:\n"
            "  /start — Restart the bot\n"
            "  /help — Help\n"
        ),
        "broadcast_usage": "❌ Format: /broadcast <message>",
        "broadcast_done": "✅ Message sent to {count} users.",
    },
}


def get_text(lang: str, key: str, **kwargs) -> str:
    text = TEXTS.get(lang, TEXTS["uz"]).get(key) or TEXTS["uz"].get(key, f"[{key}]")
    if kwargs:
        try:
            text = text.format(**kwargs)
        except Exception:
            pass
    return text


def t(lang: str, key: str) -> str:
    return get_text(lang, key)
