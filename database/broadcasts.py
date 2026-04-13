from .client import supabase
import logging
from typing import Optional

logger = logging.getLogger(__name__)


# FIX #7: Python 3.9 does not support `int | None` union syntax in function signatures.
# Use Optional[int] from typing instead.
def create_broadcast(message: str) -> Optional[int]:
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


# FIX #7 (continued): list[dict] built-in generic syntax requires Python 3.9+.
# Use List[dict] from typing for broader compatibility, or keep list[dict] if
# Python 3.9+ is guaranteed (Dockerfile uses python:3.11-slim so list[dict] is fine,
# but the same files are duplicated under kinokodbot/ where the old schema detection
# defaults to Python 3.9 syntax — standardise to Optional/List for safety).
def list_broadcasts(limit: int = 10) -> list:
    try:
        res = (supabase.table("broadcasts")
               .select("*")
               .order("created_at", desc=True)
               .limit(limit)
               .execute())
        return res.data or []
    except Exception as e:
        logger.error(f"list_broadcasts error: {e}")
        return []
