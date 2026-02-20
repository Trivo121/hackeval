from fastapi import APIRouter, Depends, Header
from app.services.auth import get_current_user
from app.services.projects import create_project_in_db
from app.services.google_drive import list_files_in_folder
from app.schemas import ProjectCreateRequest, ProjectResponse
from app.database import admin_supabase

router = APIRouter()

@router.get("/projects")
async def get_projects(current_user = Depends(get_current_user)):
    """
    Fetch all projects owned by the current user.
    """
    result = admin_supabase.table("projects") \
        .select("*") \
        .eq("owner_user_id", current_user.id) \
        .order("created_at", desc=True) \
        .execute()
    return {"projects": result.data or []}

@router.post("/projects/create", response_model=ProjectResponse)
async def create_project(project: ProjectCreateRequest, current_user = Depends(get_current_user)):
    """
    Create a new project.
    """
    return await create_project_in_db(current_user, project)

@router.get("/projects/scan-drive/{folder_id}")
async def scan_folder(folder_id: str, current_user = Depends(get_current_user)):
    pdfs = await list_files_in_folder(folder_id)
    return {"total_files": len(pdfs), "files": pdfs}
