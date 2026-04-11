from .client import supabase
import logging

logger = logging.getLogger(__name__)


def get_required_channels() -> list:
    try:
        res = supabase.table("channels").select("*").execute()
        channels = res.data or []
        result = []
        for ch in channels:
            if ch.get("is_required") is False:
                continue
            result.append({
                "channel_id": ch.get("channel_id") or ch.get("username") or str(ch.get("id", "")),
                "title": ch.get("title") or ch.get("username") or "Kanal",
                "username": ch.get("username", ""),
            })
        return result
    except Exception as e:
        logger.error(f"get_required_channels error: {e}")
        return []


def add_channel(channel_id: str, title: str, username: str = None) -> bool:
    try:
        supabase.table("channels").insert({
            "channel_id": channel_id.strip(),
            "title": title.strip(),
            "username": username.strip() if username else None,
            "is_required": True,
        }).execute()
        return True
    except Exception as e:
        logger.error(f"add_channel error: {e}")
        return False


def delete_channel(channel_id: str) -> bool:
    try:
        supabase.table("channels").delete().eq("channel_id", channel_id.strip()).execute()
        return True
    except Exception as e:
        logger.error(f"delete_channel error: {e}")
        return False


def toggle_channel(channel_id: str, required: bool) -> bool:
    try:
        supabase.table("channels").update({"is_required": required}).eq("channel_id", channel_id.strip()).execute()
        return True
    except Exception as e:
        logger.error(f"toggle_channel error: {e}")
        return False
