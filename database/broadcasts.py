from .client import supabase
import logging

logger = logging.getLogger(__name__)


def create_broadcast(message: str) -> int | None:
    try:
        res = supabase.table("broadcasts").insert({
            "message": message,
            "sent_count": 0,
            "status": "pending",
        }).execute()
        return res.data[0]["id"] if res.data else None
    except Exception as e:
        logger.error(f"create_broadcast error: {e}")
        return None


def update_broadcast_count(broadcast_id: int, sent: int, status: str = "done"):
    try:
        supabase.table("broadcasts").update({
            "sent_count": sent,
            "status": status,
        }).eq("id", broadcast_id).execute()
    except Exception as e:
        logger.error(f"update_broadcast_count error: {e}")


def list_broadcasts(limit: int = 10) -> list[dict]:
    try:
        res = supabase.table("broadcasts").select("*").order("created_at", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"list_broadcasts error: {e}")
        return []
