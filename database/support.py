from database.client import supabase


def save_support_message(telegram_id: int, username: str, first_name: str, message: str):
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
        print(f"Support message save error: {e}")
        return False


def get_support_messages(status: str = None, limit: int = 100):
    try:
        query = supabase.table("support_messages").select("*").order("created_at", desc=True).limit(limit)
        if status:
            query = query.eq("status", status)
        result = query.execute()
        return result.data or []
    except Exception as e:
        print(f"Get support messages error: {e}")
        return []


def mark_as_read(message_id: int):
    try:
        supabase.table("support_messages").update({"status": "read"}).eq("id", message_id).execute()
        return True
    except Exception as e:
        print(f"Mark as read error: {e}")
        return False


def delete_support_message(message_id: int):
    try:
        supabase.table("support_messages").delete().eq("id", message_id).execute()
        return True
    except Exception as e:
        print(f"Delete support message error: {e}")
        return False
