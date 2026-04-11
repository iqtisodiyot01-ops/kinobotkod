from .client import supabase
import logging

logger = logging.getLogger(__name__)

# Detect schema: old (user_id, lang) vs new (telegram_id, language)
def _detect_col():
    try:
        res = supabase.table("users").select("telegram_id").limit(1).execute()
        return "telegram_id", "language"
    except Exception:
        return "user_id", "lang"

_ID_COL, _LANG_COL = _detect_col()
logger.info(f"Users table schema: id_col={_ID_COL}, lang_col={_LANG_COL}")


def register_user(user_id: int, full_name: str, username: str, referral_from: int = None) -> str:
    try:
        res = supabase.table("users").select(f"{_ID_COL},{_LANG_COL}").eq(_ID_COL, user_id).limit(1).execute()
        if res.data:
            update_data = {}
            if _ID_COL == "telegram_id":
                update_data = {"full_name": full_name or "", "username": username or ""}
            supabase.table("users").update(update_data or {_LANG_COL: res.data[0].get(_LANG_COL, "uz")}).eq(_ID_COL, user_id).execute()
            return res.data[0].get(_LANG_COL, "uz")
        else:
            if _ID_COL == "telegram_id":
                data = {
                    "telegram_id": user_id,
                    "full_name": full_name or "",
                    "username": username or "",
                    "language": "uz",
                }
            else:
                data = {"user_id": user_id, "lang": "uz"}
            supabase.table("users").insert(data).execute()
            return "uz"
    except Exception as e:
        logger.error(f"register_user error: {e}")
        return "uz"


def get_user_language(user_id: int) -> str:
    try:
        res = supabase.table("users").select(_LANG_COL).eq(_ID_COL, user_id).limit(1).execute()
        if res.data:
            return res.data[0].get(_LANG_COL, "uz")
        return "uz"
    except Exception:
        return "uz"


def set_user_language(user_id: int, language: str):
    try:
        supabase.table("users").update({_LANG_COL: language}).eq(_ID_COL, user_id).execute()
    except Exception as e:
        logger.error(f"set_user_language error: {e}")


def get_all_user_ids() -> list:
    try:
        res = supabase.table("users").select(_ID_COL).execute()
        return [row[_ID_COL] for row in (res.data or [])]
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
    try:
        supabase.table("users").update({"is_premium": value}).eq(_ID_COL, user_id).execute()
    except Exception as e:
        logger.error(f"set_premium error: {e}")
