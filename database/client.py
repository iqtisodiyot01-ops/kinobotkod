import sys
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

if not SUPABASE_URL or not SUPABASE_URL.startswith("http"):
    print("❌ XATO: SUPABASE_URL environment variable qo'yilmagan!", file=sys.stderr)
    print("   Railway Variables bo'limida quyidagilarni qo'shing:", file=sys.stderr)
    print("   SUPABASE_URL = https://fkomjjvwdbxbapnivfez.supabase.co", file=sys.stderr)
    print("   SUPABASE_KEY = (supabase service role key)", file=sys.stderr)
    sys.exit(1)

if not SUPABASE_KEY:
    print("❌ XATO: SUPABASE_KEY environment variable qo'yilmagan!", file=sys.stderr)
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
