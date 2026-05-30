# backend/app/database.py
import os
from supabase import create_client, Client
from fastapi import Security, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# 1. Admin Client - USE ONLY FOR ADMIN/BACKGROUND TASKS
admin_supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# 2. Setup token extraction
security = HTTPBearer()

# 3. New Dependency: User-Scoped Client (Enforces RLS)
def get_user_client(credentials: HTTPAuthorizationCredentials = Security(security)) -> Client:
    """
    Creates a Supabase client that enforces Row Level Security (RLS) 
    by injecting the authenticated user's JWT token.
    """
    token = credentials.credentials
    
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token missing")

    # Initialize with the Anon Key (which tells PostgREST to respect RLS)
    user_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    # Inject the user's JWT token so the database knows exactly who is making the request
    user_client.postgrest.auth(token)
    
    return user_client