
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL:
    print("WARNING: SUPABASE_URL is not set.")
if not SUPABASE_ANON_KEY:
    print("WARNING: SUPABASE_ANON_KEY is not set.")
if not SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_KEY == "REPLACE_ME_WITH_REAL_SERVICE_KEY":
    print("WARNING: SUPABASE_SERVICE_KEY is not set or is invalid. Admin operations will fail.")
    # Fallback to anon key for now so app doesn't crash on startup, but admin actions will strictly fail later
    SUPABASE_SERVICE_KEY_TO_USE = SUPABASE_ANON_KEY 
else:
    SUPABASE_SERVICE_KEY_TO_USE = SUPABASE_SERVICE_KEY

try:
    # 1. Admin Client (Bypasses RLS) - Use for backend operations
    # If using Anon key here, it won't actually bypass RLS, but prevents crash.
    admin_supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY_TO_USE)
    
    # 2. Public Client (Respects RLS)
    anon_supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
except Exception as e:
    print(f"Failed to initialize Supabase client: {e}")
    # Create dummy clients to prevent import errors in other files
    class DummyClient:
        auth = None
        def table(self, *args): return self
        def select(self, *args): return self
        def eq(self, *args): return self
        def execute(self): return None
    admin_supabase = DummyClient()
    anon_supabase = DummyClient()
