from .client import supabase
import logging

# FIX #8: database/support.py uses `from database.client import supabase` (absolute import)
# while all other database modules use `from .client import supabase` (relative import).
# This causes an ImportError when the package is run as `python main.py` from the project
# root because Python resolves the absolute `database.client` but in some environments
# it may fail. Standardise to relative import.

logger = logging.getLogger(__name__)


def save_support_message(telegram_id: int, username: str, first_name: str, message: str) -> bool:
    try:
        supabase.table("support_messages").insert({
            "telegram_id": telegram_id,
            "username": username or "",
            "first_name": first_name or "",
            "message": message,
            "status": "new"
        }).execute()
        return True
    except Exception as e:
        logger.error(f"Support message save error: {e}")
        return False


def get_support_messages(status: str = None, limit: int = 100) -> list:
    try:
        query = (supabase.table("support_messages")
                 .select("*")
                 .order("created_at", desc=True)
                 .limit(limit))
        if status:
            query = query.eq("status", status)
        result = query.execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Get support messages error: {e}")
        return []


def mark_as_read(message_id: int) -> bool:
    try:
        supabase.table("support_messages").update({"status": "read"}).eq("id", message_id).execute()
        return True
    except Exception as e:
        logger.error(f"Mark as read error: {e}")
        return False


def delete_support_message(message_id: int) -> bool:
    try:
        supabase.table("support_messages").delete().eq("id", message_id).execute()
        return True
    except Exception as e:
        logger.error(f"Delete support message error: {e}")
        return False
