from .client import supabase
import logging

logger = logging.getLogger(__name__)


def get_movie_by_code(code: str):
    try:
        res = supabase.table("movies").select("*").eq("code", code.strip()).limit(1).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"get_movie_by_code error: {e}")
        return None


def search_movies(query: str) -> list:
    try:
        res = supabase.table("movies").select("code, title").ilike("title", f"%{query}%").limit(5).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"search_movies error: {e}")
        return []


def add_movie(code: str, title: str, file_id: str = None) -> bool:
    try:
        supabase.table("movies").upsert({
            "code": code.strip(),
            "title": title.strip(),
            "file_id": file_id,
        }).execute()
        return True
    except Exception as e:
        logger.error(f"add_movie error: {e}")
        return False


def delete_movie(code: str) -> bool:
    try:
        supabase.table("movies").delete().eq("code", code.strip()).execute()
        return True
    except Exception as e:
        logger.error(f"delete_movie error: {e}")
        return False


def list_movies(limit: int = 10, offset: int = 0) -> list:
    try:
        res = supabase.table("movies").select("code, title, created_at").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"list_movies error: {e}")
        return []
