
from fastapi import HTTPException, status, Header
from typing import Optional
from app.database import admin_supabase_async
from supabase import AsyncClient

async def get_current_user(authorization: str = Header(...)):
    """
    Dependency to verify the Bearer token asynchronously and return the user.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    token = authorization.split(" ")[1]
    
    try:
        # Verify token asynchronously with Supabase
        user_response = await admin_supabase_async.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        return user_response.user
        
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

async def sync_user_to_db(user, db_client: AsyncClient):
    """
    Syncs the authenticated Supabase user to our public.users table asynchronously.
    """
    try:
        # Extract user info
        user_id = user.id
        email = user.email
        
        # Get metadata
        meta = user.user_metadata or {}
        full_name = meta.get("full_name") or meta.get("name") or email.split("@")[0]
        avatar_url = meta.get("avatar_url") or meta.get("picture")
        
        # Get Google sub ID
        google_sub = None
        if user.identities:
            for identity in user.identities:
                if identity.provider == "google":
                    google_sub = identity.id
                    break
        
        user_data = {
            "user_id": user_id,  # Map auth 'id' to table column 'user_id'
            "email": email,
            "full_name": full_name,
            "avatar_url": avatar_url,
            "google_sub": google_sub
        }

        # Check if user already exists to preserve access_status
        existing = await db_client.table("users").select("*").eq("user_id", user_id).execute()
        if existing.data:
            user_data["access_status"] = existing.data[0].get("access_status", "pending")
        else:
            user_data["access_status"] = "pending"

        # Upsert (Insert or Update)
        # on_conflict="user_id" tells Supabase which column to check for duplicates
        response = await db_client.table("users").upsert(
            user_data, on_conflict="user_id"
        ).execute()
        return response.data[0] if response.data else user_data

    except Exception as e:
        print(f"Sync Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to sync user to database")

async def update_user_profile(user_id: str, updates, db_client: AsyncClient) -> dict:
    try:
        data = updates.model_dump(exclude_unset=True)
        if not data:
            return None
            
        print(f"Updating user {user_id} with data: {data}")
        response = await db_client.table("users").update(data).eq("user_id", user_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error updating profile: {e}")
        raise e
