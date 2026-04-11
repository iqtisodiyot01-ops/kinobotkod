from .client import supabase
import logging

logger = logging.getLogger(__name__)

# Existing Supabase schema uses user_id and lang columns
# After running migrate.sql, it will use telegram_id and language
# Bot auto-detects which schema is active at startup

_SCHEMA = {"id": "user_id", "lang": "lang"}


def _init_schema():
    global _SCHEMA
    try:
        res = supabase.table("users").select("telegram_id").limit(1).execute()
        if isinstance(res.data, list):
            _SCHEMA = {"id": "telegram_id", "lang": "language"}
            logger.info("Schema: new (telegram_id, language)")
        else:
            _SCHEMA = {"id": "user_id", "lang": "lang"}
            logger.info("Schema: old (user_id, lang)")
    except Exception:
        _SCHEMA = {"id": "user_id", "lang": "lang"}
        logger.info("Schema: old (user_id, lang) [fallback]")


def init():
    _init_schema()


def _detect_lang(telegram_lang: str) -> str:
    if not telegram_lang:
        return "uz"
    lc = telegram_lang.lower()
    if lc.startswith("ru"):
        return "ru"
    if lc.startswith("en"):
        return "en"
    return "uz"


def register_user(user_id: int, full_name: str, username: str,
                  telegram_lang: str = None, referral_from: int = None) -> str:
    id_col = _SCHEMA["id"]
    lang_col = _SCHEMA["lang"]
    try:
        res = supabase.table("users").select(f"{id_col},{lang_col}").eq(id_col, user_id).limit(1).execute()
        if res.data:
            lang = res.data[0].get(lang_col, "uz") or "uz"
            if id_col == "telegram_id":
                try:
                    supabase.table("users").update({
                        "full_name": full_name or "",
                        "username": username or "",
                    }).eq(id_col, user_id).execute()
                except Exception:
                    pass
            return lang
        auto_lang = _detect_lang(telegram_lang)
        data = {id_col: user_id, lang_col: auto_lang}
        if id_col == "telegram_id":
            data["full_name"] = full_name or ""
            data["username"] = username or ""
            data["is_premium"] = False
        supabase.table("users").insert(data).execute()
        return auto_lang
    except Exception as e:
        logger.error(f"register_user error: {e}")
        return "uz"


def get_user_language(user_id: int) -> str:
    id_col = _SCHEMA["id"]
    lang_col = _SCHEMA["lang"]
    try:
        res = supabase.table("users").select(lang_col).eq(id_col, user_id).limit(1).execute()
        if res.data:
            return res.data[0].get(lang_col, "uz") or "uz"
        return "uz"
    except Exception:
        return "uz"


def set_user_language(user_id: int, language: str):
    id_col = _SCHEMA["id"]
    lang_col = _SCHEMA["lang"]
    try:
        supabase.table("users").update({lang_col: language}).eq(id_col, user_id).execute()
    except Exception as e:
        logger.error(f"set_user_language error: {e}")


def get_all_user_ids() -> list:
    id_col = _SCHEMA["id"]
    try:
        res = supabase.table("users").select(id_col).execute()
        return [row[id_col] for row in (res.data or [])]
    except Exception as e:
        logger.error(f"get_all_user_ids error: {e}")
        return []


def get_stats() -> dict:
    try:
        total = supabase.table("users").select("*", count="exact", head=True).execute()
        movies = supabase.table("movies").select("*", count="exact", head=True).execute()
        channels = supabase.table("channels").select("*", count="exact", head=True).execute()
        return {
            "users": total.count or 0,
            "premium": 0,
            "movies": movies.count or 0,
            "channels": channels.count or 0,
        }
    except Exception as e:
        logger.error(f"get_stats error: {e}")
        return {"users": 0, "premium": 0, "movies": 0, "channels": 0}


def set_premium(user_id: int, value: bool = True):
    id_col = _SCHEMA["id"]
    try:
        supabase.table("users").update({"is_premium": value}).eq(id_col, user_id).execute()
    except Exception as e:
        logger.error(f"set_premium error: {e}")
