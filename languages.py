TEXTS = {
    "uz": {
        "choose_lang": "🌐 Tilni tanlang / Выберите язык / Choose language:",
        "welcome": (
            "🎬 Assalomu alaykum, Kino olamiga xush kelibsiz!\n\n"
            "Bu bot orqali siz istalgan kinoni nomi yoki kodi orqali tez va oson topasiz.\n"
            "🍿 Shunchaki kino nomi yoki kodini yuboring — biz esa sizga uni tayyorlab beramiz!\n\n"
            "🔎 Kino nomini yozing yoki shunchaki kino kodini kiriting:"
        ),
        "sub_required": (
            "🔒 Iltimos, quyidagi kanallarimizga obuna bo'ling,\n"
            "keyin botni ishlatishingiz mumkin."
        ),
        "sub_button": "📢 Obuna bo'lish",
        "sub_done": "✅ Obuna bo'ldim",
        "sub_check_fail": (
            "❌ Siz hali barcha kanallarga obuna bo'lmagansiz!\n"
            "Iltimos, obuna bo'lib, qayta urinib ko'ring."
        ),
        "sub_success": (
            "✅ Rahmat! Endi botdan foydalanishingiz mumkin.\n\n"
            "🔎 Kino nomini yozing yoki kino kodini kiriting:"
        ),
        "not_found": (
            "😔 Bunday kino topilmadi. Boshqa kinoni izlab ko'ring.\n\n"
            "💡 Hohlasangiz eng sara kinolar ro'yxatini telegram kanalimizdan ko'rishingiz mumkin."
        ),
        "lang_changed": "✅ Til o'zgartirildi: O'zbekcha 🇺🇿",
        "help": (
            "🆘 Yordam bo'limi:\n\n"
            "🔎 Kino topish:\n"
            "  — Kino kodini yuboring (masalan: `101`)\n"
            "  — Yoki kino nomini yozing\n\n"
            "⚙️ Buyruqlar:\n"
            "  /start — Botni qayta ishga tushirish\n"
            "  /lang — Tilni o'zgartirish\n"
            "  /help — Yordam\n"
        ),
        "broadcast_usage": "❌ Format: `/broadcast <xabar matni>`",
        "broadcast_done": "✅ Xabar {count} ta foydalanuvchiga yuborildi.",
    },
    "ru": {
        "choose_lang": "🌐 Tilni tanlang / Выберите язык / Choose language:",
        "welcome": (
            "🎬 Привет! Добро пожаловать в мир Кино!\n\n"
            "С помощью этого бота вы можете легко найти любой фильм по названию или коду.\n"
            "🍿 Просто отправьте название или код фильма — и мы подготовим его для вас!\n\n"
            "🔎 Напишите название фильма или введите код:"
        ),
        "sub_required": (
            "🔒 Пожалуйста, подпишитесь на наши каналы,\n"
            "затем вы сможете пользоваться ботом."
        ),
        "sub_button": "📢 Подписаться",
        "sub_done": "✅ Я подписался",
        "sub_check_fail": (
            "❌ Вы ещё не подписались на все каналы!\n"
            "Пожалуйста, подпишитесь и попробуйте снова."
        ),
        "sub_success": (
            "✅ Спасибо! Теперь вы можете пользоваться ботом.\n\n"
            "🔎 Напишите название фильма или введите код:"
        ),
        "not_found": (
            "😔 Такой фильм не найден. Попробуйте найти другой.\n\n"
            "💡 Вы можете посмотреть список лучших фильмов в нашем Telegram-канале."
        ),
        "lang_changed": "✅ Язык изменён: Русский 🇷🇺",
        "help": (
            "🆘 Помощь:\n\n"
            "🔎 Поиск фильма:\n"
            "  — Отправьте код фильма (например: `101`)\n"
            "  — Или напишите название фильма\n\n"
            "⚙️ Команды:\n"
            "  /start — Перезапустить бота\n"
            "  /lang — Сменить язык\n"
            "  /help — Помощь\n"
        ),
        "broadcast_usage": "❌ Формат: `/broadcast <текст сообщения>`",
        "broadcast_done": "✅ Сообщение отправлено {count} пользователям.",
    },
    "en": {
        "choose_lang": "🌐 Tilni tanlang / Выберите язык / Choose language:",
        "welcome": (
            "🎬 Hello! Welcome to the Movie World!\n\n"
            "With this bot you can easily find any movie by name or code.\n"
            "🍿 Just send the movie name or code — and we will prepare it for you!\n\n"
            "🔎 Write the movie name or enter the movie code:"
        ),
        "sub_required": (
            "🔒 Please subscribe to our channels,\n"
            "then you can use the bot."
        ),
        "sub_button": "📢 Subscribe",
        "sub_done": "✅ I subscribed",
        "sub_check_fail": (
            "❌ You have not subscribed to all channels yet!\n"
            "Please subscribe and try again."
        ),
        "sub_success": (
            "✅ Thank you! Now you can use the bot.\n\n"
            "🔎 Write the movie name or enter the movie code:"
        ),
        "not_found": (
            "😔 This movie was not found. Try searching for another one.\n\n"
            "💡 You can view the list of top movies in our Telegram channel."
        ),
        "lang_changed": "✅ Language changed: English 🇬🇧",
        "help": (
            "🆘 Help:\n\n"
            "🔎 Search a movie:\n"
            "  — Send the movie code (e.g. `101`)\n"
            "  — Or type the movie name\n\n"
            "⚙️ Commands:\n"
            "  /start — Restart the bot\n"
            "  /lang — Change language\n"
            "  /help — Help\n"
        ),
        "broadcast_usage": "❌ Format: `/broadcast <message text>`",
        "broadcast_done": "✅ Message sent to {count} users.",
    },
}


def t(lang: str, key: str) -> str:
    return TEXTS.get(lang, TEXTS["uz"]).get(key, "")
