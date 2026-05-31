# backend/app/database.py
import os
from supabase import create_client, Client, AsyncClient
from fastapi import Security, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

import base64
import json

def _validate_supabase_keys():
    """
    Decodes the JWT payloads of SUPABASE_ANON_KEY and SUPABASE_SERVICE_KEY on startup
    to prevent configuration mistakes, invalid keys, or fragile silent fallbacks.
    """
    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL environment variable is missing or empty.")
    if not SUPABASE_ANON_KEY:
        raise RuntimeError("SUPABASE_ANON_KEY environment variable is missing or empty.")
    if not SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_KEY environment variable is missing or empty.")

    def decode_jwt_role(token: str) -> str:
        try:
            # Strip potential surrounding quotes
            token_clean = token.strip().strip('"').strip("'")
            parts = token_clean.split('.')
            if len(parts) != 3:
                return "invalid_format"
            payload_b64 = parts[1]
            # Add padding
            payload_b64 += '=' * ((4 - len(payload_b64) % 4) % 4)
            payload_decoded = base64.urlsafe_b64decode(payload_b64).decode('utf-8')
            payload_json = json.loads(payload_decoded)
            return payload_json.get("role", "")
        except Exception:
            return "decoding_failed"

    anon_role = decode_jwt_role(SUPABASE_ANON_KEY)
    service_role = decode_jwt_role(SUPABASE_SERVICE_KEY)

    if anon_role != "anon":
        raise RuntimeError(
            f"SUPABASE_ANON_KEY is invalid or mismatched. "
            f"Expected role 'anon', got '{anon_role}'."
        )

    if service_role != "service_role":
        raise RuntimeError(
            f"SUPABASE_SERVICE_KEY is invalid or mismatched. "
            f"Expected role 'service_role', got '{service_role}'."
        )

# Run strict startup validations
_validate_supabase_keys()

# 1. Admin Clients
admin_supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
admin_supabase_async: AsyncClient = AsyncClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# 2. Setup token extraction
security = HTTPBearer()

# 3. New Dependency: User-Scoped Client (Enforces RLS)
def get_user_client(credentials: HTTPAuthorizationCredentials = Security(security)) -> AsyncClient:
    """
    Creates a Supabase client that enforces Row Level Security (RLS) 
    by injecting the authenticated user's JWT token asynchronously.
    """
    token = credentials.credentials
    
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token missing")

    # Initialize with the Anon Key (which tells PostgREST to respect RLS)
    user_client = AsyncClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    # Inject the user's JWT token so the database knows exactly who is making the request
    user_client.postgrest.auth(token)
    
    return user_client