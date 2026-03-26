
import os
# Set HuggingFace env vars BEFORE any model imports
os.environ.setdefault("HF_HOME", "D:/hf_cache")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routes import auth, projects
from app.services.qdrant_service import init_qdrant_collection

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Qdrant Collection
    init_qdrant_collection()
    yield

app = FastAPI(title="HackEval Backend", lifespan=lifespan)

# CORS Middleware (Allow Frontend to talk to Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router, tags=["Authentication"])
app.include_router(projects.router, tags=["Projects"])

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend is running"}