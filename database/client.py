import sys
import logging
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)

_url = (SUPABASE_URL or "").strip()
_key = (SUPABASE_KEY or "").strip()

if not _url or not _url.startswith("http"):
    print(f"❌ SUPABASE_URL noto'g'ri: '{_url}'", file=sys.stderr)
    print("   To'g'ri format: https://fkomjjvwdbxbapnivfez.supabase.co", file=sys.stderr)
    sys.exit(1)

if not _key:
    print("❌ SUPABASE_KEY bo'sh!", file=sys.stderr)
    sys.exit(1)

try:
    supabase = create_client(_url, _key)
    logger.info(f"Supabase ulandi: {_url}")
except Exception as e:
    print(f"❌ Supabase ulanishda xato: {e}", file=sys.stderr)
    sys.exit(1)
