from .client import supabase
import logging

logger = logging.getLogger(__name__)

_SCHEMA = {"id": "telegram_id", "lang": "language"}


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
        _SCHEMA = {"id": "telegram_id", "lang": "language"}
        logger.info("Schema: new (telegram_id, language) [default]")


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
            # FIX #4: Update full_name/username on every visit so profile stays fresh.
            try:
                supabase.table("users").update({
                    "full_name": full_name or "",
                    "username": username or "",
                }).eq(id_col, user_id).execute()
            except Exception:
                pass
            return res.data[0].get(lang_col, "uz") or "uz"
        auto_lang = _detect_lang(telegram_lang)
        data = {
            id_col: user_id,
            lang_col: auto_lang,
            "full_name": full_name or "",
            "username": username or "",
            "is_premium": False,
            "referral_from": referral_from,
            "referral_count": 0,
            "credits": 0,
        }
        # FIX #5: Fallback to minimal insert if full insert fails (e.g. missing columns in old schema).
        try:
            supabase.table("users").insert(data).execute()
        except Exception:
            minimal = {id_col: user_id, lang_col: auto_lang}
            supabase.table("users").insert(minimal).execute()
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


def check_premium(user_id: int) -> bool:
    id_col = _SCHEMA["id"]
    try:
        res = supabase.table("users").select("is_premium").eq(id_col, user_id).limit(1).execute()
        if res.data:
            return bool(res.data[0].get("is_premium", False))
        return False
    except Exception as e:
        logger.error(f"check_premium error: {e}")
        return False


def set_premium(user_id: int, value: bool = True):
    id_col = _SCHEMA["id"]
    try:
        supabase.table("users").update({"is_premium": value}).eq(id_col, user_id).execute()
    except Exception as e:
        logger.error(f"set_premium error: {e}")


def get_user_credits(user_id: int) -> int:
    id_col = _SCHEMA["id"]
    try:
        res = supabase.table("users").select("credits,referral_count").eq(id_col, user_id).limit(1).execute()
        if res.data:
            row = res.data[0]
            return (row.get("credits") or 0) + (row.get("referral_count") or 0)
        return 0
    except Exception as e:
        logger.error(f"get_user_credits error: {e}")
        return 0


def use_credit(user_id: int) -> bool:
    """Deduct one credit from user. Returns True if successful."""
    id_col = _SCHEMA["id"]
    try:
        res = supabase.table("users").select("credits").eq(id_col, user_id).limit(1).execute()
        if res.data:
            current = int(res.data[0].get("credits") or 0)
            if current > 0:
                supabase.table("users").update({"credits": current - 1}).eq(id_col, user_id).execute()
                return True
        return False
    except Exception as e:
        logger.error(f"use_credit error: {e}")
        return False


def register_referral(referrer_id: int, new_user_id: int) -> int:
    """Give credit to referrer. Returns new credit total."""
    id_col = _SCHEMA["id"]
    try:
        res = supabase.table("users").select("credits,referral_count").eq(id_col, referrer_id).limit(1).execute()
        if not res.data:
            return 0
        row = res.data[0]
        new_credits = (row.get("credits") or 0) + 1
        new_referral_count = (row.get("referral_count") or 0) + 1
        supabase.table("users").update({
            "credits": new_credits,
            "referral_count": new_referral_count,
        }).eq(id_col, referrer_id).execute()

        # Mark new user as referred
        supabase.table("users").update({"referral_from": referrer_id}).eq(id_col, new_user_id).execute()
        return new_credits
    except Exception as e:
        logger.error(f"register_referral error: {e}")
        return 0


def get_all_user_ids() -> list:
    id_col = _SCHEMA["id"]
    try:
        # FIX #6: Supabase default row limit is 1000. Use pagination to get ALL users.
        all_ids = []
        page_size = 1000
        offset = 0
        while True:
            res = supabase.table("users").select(id_col).range(offset, offset + page_size - 1).execute()
            rows = res.data or []
            all_ids.extend(row[id_col] for row in rows)
            if len(rows) < page_size:
                break
            offset += page_size
        return all_ids
    except Exception as e:
        logger.error(f"get_all_user_ids error: {e}")
        return []


def get_stats() -> dict:
    try:
        total = supabase.table("users").select("*", count="exact", head=True).execute()
        movies = supabase.table("movies").select("*", count="exact", head=True).execute()
        channels = supabase.table("channels").select("*", count="exact", head=True).execute()
        premium = supabase.table("users").select("*", count="exact", head=True).eq("is_premium", True).execute()
        return {
            "users": total.count or 0,
            "premium": premium.count or 0,
            "movies": movies.count or 0,
            "channels": channels.count or 0,
        }
    except Exception as e:
        logger.error(f"get_stats error: {e}")
        return {"users": 0, "premium": 0, "movies": 0, "channels": 0}
