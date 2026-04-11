from .client import supabase
import logging

logger = logging.getLogger(__name__)


def register_user(user_id: int, full_name: str, username: str, referral_from: int = None) -> str:
    try:
        res = supabase.table("users").select("telegram_id, language").eq("telegram_id", user_id).limit(1).execute()
        if res.data:
            supabase.table("users").update({
                "full_name": full_name or "",
                "username": username or ""
            }).eq("telegram_id", user_id).execute()
            return res.data[0].get("language", "uz")
        else:
            data = {
                "telegram_id": user_id,
                "full_name": full_name or "",
                "username": username or "",
                "language": "uz",
                "is_premium": False,
            }
            if referral_from:
                data["referral_from"] = referral_from
            supabase.table("users").insert(data).execute()
            return "uz"
    except Exception as e:
        logger.error(f"register_user error: {e}")
        return "uz"


def get_user_language(user_id: int) -> str:
    try:
        res = supabase.table("users").select("language").eq("telegram_id", user_id).limit(1).execute()
        if res.data:
            return res.data[0].get("language", "uz")
        return "uz"
    except Exception:
        return "uz"


def set_user_language(user_id: int, language: str):
    try:
        supabase.table("users").update({"language": language}).eq("telegram_id", user_id).execute()
    except Exception as e:
        logger.error(f"set_user_language error: {e}")


def get_all_user_ids() -> list:
    try:
        res = supabase.table("users").select("telegram_id").execute()
        return [row["telegram_id"] for row in (res.data or [])]
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
        supabase.table("users").update({"is_premium": value}).eq("telegram_id", user_id).execute()
    except Exception as e:
        logger.error(f"set_premium error: {e}")
