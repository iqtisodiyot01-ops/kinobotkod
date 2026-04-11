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
            try:
                supabase.table("users").update({
                    "full_name": full_name or "",
                    "username": username or "",
                }).eq(id_col, user_id).execute()
            except Exception:
                pass
            return lang
        auto_lang = _detect_lang(telegram_lang)
        data = {id_col: user_id, lang_col: auto_lang,
                "full_name": full_name or "", "username": username or "", "is_premium": False}
        try:
            supabase.table("users").insert(data).execute()
        except Exception:
            minimal = {id_col: user_id, lang_col: auto_lang}
            supabase.table("users").insert(minimal).execute()
        return auto_lang
    except Exception as e:
        logger.error(f"register_user error: {e}")
        return "uz"


def check_premium(user_id: int) -> bool:
    id_col = _SCHEMA["id"]
    try:
        res = supabase.table("users").select("is_premium").eq(id_col, user_id).limit(1).execute()
        if res.data:
            return bool(res.data[0].get("is_premium", False))
        return False
    except Exception:
        return False


def get_user_credits(user_id: int) -> int:
    id_col = _SCHEMA["id"]
    try:
        res = supabase.table("users").select("credits").eq(id_col, user_id).limit(1).execute()
        if res.data:
            return int(res.data[0].get("credits", 0) or 0)
        return 0
    except Exception:
        return 0


def add_credits(user_id: int, amount: int = 1):
    id_col = _SCHEMA["id"]
    try:
        current = get_user_credits(user_id)
        supabase.table("users").update({"credits": current + amount}).eq(id_col, user_id).execute()
    except Exception as e:
        logger.error(f"add_credits error: {e}")


def use_credit(user_id: int) -> bool:
    id_col = _SCHEMA["id"]
    try:
        current = get_user_credits(user_id)
        if current > 0:
            supabase.table("users").update({"credits": current - 1}).eq(id_col, user_id).execute()
            return True
        return False
    except Exception as e:
        logger.error(f"use_credit error: {e}")
        return False


def register_referral(referrer_id: int, referred_id: int):
    try:
        existing = supabase.table("referrals").select("id").eq("referred_id", referred_id).limit(1).execute()
        if existing.data:
            return
        supabase.table("referrals").insert({
            "referrer_id": referrer_id,
            "referred_id": referred_id,
        }).execute()
        add_credits(referrer_id, 1)
        logger.info(f"Referral: {referred_id} joined via {referrer_id} — credit added")
    except Exception as e:
        logger.error(f"register_referral error: {e}")


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
