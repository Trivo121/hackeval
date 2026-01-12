from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("https://frbcjkctbjgnfzvoxzby.supabase.co")
key = os.environ.get("sb_publishable__ZZFBrzlNNaUBWIA1HOmcg_8gT98tvC")
supabase: Client = create_client(url, key)

app = FastAPI(title="HackEval Backend")
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        user = supabase.auth.get_user(token)
        if not user:
             raise HTTPException(status_code=401, detail="Invalid Authentication Token")
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend is running"}

@app.get("/api/v1/profile")
def get_user_profile(user = Depends(get_current_user)):
    return {
        "id": user.user.id,
        "email": user.user.email,
        "message": "Welcome to the protected zone!"
    }