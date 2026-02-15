
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, projects

app = FastAPI(title="HackEval Backend")

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
# app.include_router(projects.router, tags=["Projects"]) # Uncomment when projects service is ready

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend is running"}