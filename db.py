from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ─── MOVIES ─────────────────────────────────────────────

async def add_movie(code: str, file_id: str = None, title: str = None) -> bool:
    try:
        supabase.table("movies").insert({
            "code": code,
            "file_id": file_id,
            "title": title,
        }).execute()
        return True
    except Exception:
        return False


async def remove_movie(code: str) -> bool:
    result = supabase.table("movies").delete().eq("code", code).execute()
    return len(result.data) > 0


async def get_movie(code: str) -> dict | None:
    result = supabase.table("movies").select("*").eq("code", code).limit(1).execute()
    return result.data[0] if result.data else None


async def search_movies_by_title(title: str) -> list:
    result = supabase.table("movies").select("*").ilike("title", f"%{title}%").limit(10).execute()
    return result.data or []


async def get_all_movies() -> list:
    result = supabase.table("movies").select("code, title").execute()
    return result.data or []


async def count_movies() -> int:
    result = supabase.table("movies").select("code", count="exact").execute()
    return result.count or 0


# ─── CHANNELS ────────────────────────────────────────────

async def add_channel(username: str, chat_url: str = None) -> bool:
    try:
        supabase.table("channels").insert({
            "username": username,
            "chat_url": chat_url,
        }).execute()
        return True
    except Exception:
        return False


async def remove_channel(username: str) -> bool:
    result = supabase.table("channels").delete().eq("username", username).execute()
    return len(result.data) > 0


async def get_all_channels() -> list:
    result = supabase.table("channels").select("username, chat_url").execute()
    return result.data or []


async def count_channels() -> int:
    result = supabase.table("channels").select("username", count="exact").execute()
    return result.count or 0


# ─── USERS ───────────────────────────────────────────────

async def register_user(user_id: int) -> None:
    try:
        supabase.table("users").upsert(
            {"user_id": user_id, "lang": "uz"},
            on_conflict="user_id",
            ignore_duplicates=True,
        ).execute()
    except Exception:
        pass


async def get_user_lang(user_id: int) -> str:
    result = supabase.table("users").select("lang").eq("user_id", user_id).limit(1).execute()
    if result.data:
        return result.data[0].get("lang", "uz")
    return "uz"


async def set_user_lang(user_id: int, lang: str) -> None:
    # upsert: insert or update
    try:
        supabase.table("users").upsert({"user_id": user_id, "lang": lang}).execute()
    except Exception:
        pass


async def count_users() -> int:
    result = supabase.table("users").select("user_id", count="exact").execute()
    return result.count or 0


async def get_all_user_ids() -> list[int]:
    result = supabase.table("users").select("user_id").execute()
    return [row["user_id"] for row in (result.data or [])]
