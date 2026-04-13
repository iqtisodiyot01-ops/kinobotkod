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

# FIX #1: PAYMENT_CARD, PAYMENT_PRICE, BOT_USERNAME were missing from root config.py
# but referenced in handlers/payment.py and handlers/start.py
PAYMENT_CARD = os.getenv("PAYMENT_CARD", "").strip()
PAYMENT_PRICE = os.getenv("PAYMENT_PRICE", "30,000 so'm").strip()
BOT_USERNAME = os.getenv("BOT_USERNAME", "").strip()
