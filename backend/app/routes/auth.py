
from fastapi import APIRouter, Depends, Header, HTTPException
from app.services.auth import get_current_user, sync_user_to_db, update_user_profile
from app.schemas import UserResponse, UserUpdate

router = APIRouter()

@router.post("/auth/sync", response_model=UserResponse)
async def sync_user_endpoint(user = Depends(get_current_user)):
    """
    Called by frontend after Google Login.
    1. Verifies the token (via get_current_user dependency)
    2. Syncs user to public.users table
    3. Returns user profile
    """
    synced_user = sync_user_to_db(user)
    return synced_user

@router.put("/auth/profile", response_model=UserResponse)
async def update_profile_endpoint(
    updates: UserUpdate,
    user = Depends(get_current_user)
):
    """
    Update logged-in user's profile details
    """
    updated_user = update_user_profile(user.id, updates)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found or update failed")
    return updated_user