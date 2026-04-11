import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "").replace(" ", "").strip()

admin_ids_str = os.getenv("ADMIN_IDS", "").strip()
ADMIN_IDS = list(map(int, admin_ids_str.split(","))) if admin_ids_str else []

CHANNELS = [c.strip() for c in os.getenv("CHANNELS", "").split(",") if c.strip()]
MOVIE_CHANNEL = os.getenv("MOVIE_CHANNEL", "")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()
