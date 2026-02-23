from fastapi import APIRouter, Depends, Header, BackgroundTasks, HTTPException
from app.services.auth import get_current_user
from app.services.projects import create_project_in_db
from app.services.google_drive import list_files_in_folder, scan_and_store_submissions
from app.services.pdf_processor import process_submissions_background
from app.schemas import ProjectCreateRequest, ProjectResponse, ProcessingStartResponse
from app.database import admin_supabase
import re

router = APIRouter()

@router.get("/projects")
async def get_projects(current_user = Depends(get_current_user)):
    """Fetch all projects owned by the current user."""
    result = admin_supabase.table("projects") \
        .select("*") \
        .eq("owner_user_id", current_user.id) \
        .order("created_at", desc=True) \
        .execute()
    return {"projects": result.data or []}

@router.get("/projects/{project_id}/details")
async def get_project_details(project_id: str, current_user = Depends(get_current_user)):
    """Return project + all submissions + slide counts."""
    project_res = (
        admin_supabase.table("projects")
        .select("*")
        .eq("project_id", project_id)
        .eq("owner_user_id", current_user.id)
        .single()
        .execute()
    )
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found.")

    submissions_res = (
        admin_supabase.table("submissions")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .execute()
    )
    submissions = submissions_res.data or []

    # Attach slide count per submission
    for sub in submissions:
        slides_res = (
            admin_supabase.table("submission_slides")
            .select("slide_id", count="exact")
            .eq("submission_id", sub["submission_id"])
            .execute()
        )
        sub["slide_count"] = slides_res.count or 0

    return {"project": project_res.data, "submissions": submissions}

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


@router.post("/projects/{project_id}/start-scan")
async def start_scan(project_id: str, current_user = Depends(get_current_user)):
    """
    Scans the project's Google Drive folder and persists all PDFs as
    'pending' submissions in the database. Called right after project creation.
    """
    # Verify ownership and get drive_folder_url
    project_res = (
        admin_supabase.table("projects")
        .select("project_id, drive_folder_url")
        .eq("project_id", project_id)
        .eq("owner_user_id", current_user.id)
        .single()
        .execute()
    )
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")

    drive_folder_url = project_res.data.get("drive_folder_url", "")

    # Extract folder_id from URL
    match = re.search(r'/folders/([a-zA-Z0-9_-]+)', drive_folder_url)
    if not match:
        raise HTTPException(status_code=400, detail="Project has no valid Drive folder URL.")

    folder_id = match.group(1)
    result = await scan_and_store_submissions(project_id, folder_id, drive_folder_url)
    return {
        "message": f"Scan complete. {result['stored']} submission(s) stored.",
        "project_id": project_id,
        **result
    }


@router.post("/projects/{project_id}/start-processing", response_model=ProcessingStartResponse)
async def start_processing(
    project_id: str,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """
    Kicks off background PDF processing for all pending submissions in this project.
    Returns immediately with a count of queued submissions.
    """
    # Verify project exists and belongs to this user
    project_res = (
        admin_supabase.table("projects")
        .select("project_id, project_name, status")
        .eq("project_id", project_id)
        .eq("owner_user_id", current_user.id)
        .single()
        .execute()
    )
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")

    # Count pending submissions so we can report back right away
    pending_res = (
        admin_supabase.table("submissions")
        .select("submission_id", count="exact")
        .eq("project_id", project_id)
        .eq("processing_status", "pending")
        .execute()
    )
    pending_count = pending_res.count or 0

    if pending_count == 0:
        return ProcessingStartResponse(
            message="No pending submissions to process.",
            project_id=project_id,
            queued=0
        )

    # Fire off the background worker — returns immediately
    background_tasks.add_task(process_submissions_background, project_id)

    return ProcessingStartResponse(
        message=f"Processing started for {pending_count} submission(s).",
        project_id=project_id,
        queued=pending_count
    )


@router.post("/projects/{project_id}/reset-submissions")
async def reset_submissions(project_id: str, current_user = Depends(get_current_user)):
    """Reset all submissions to 'pending' so they can be re-extracted."""
    project_res = (
        admin_supabase.table("projects")
        .select("project_id")
        .eq("project_id", project_id)
        .eq("owner_user_id", current_user.id)
        .single()
        .execute()
    )
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")

    admin_supabase.table("submissions") \
        .update({"processing_status": "pending"}) \
        .eq("project_id", project_id) \
        .execute()

    # Delete old slides so they get re-extracted cleanly
    sub_ids_res = admin_supabase.table("submissions") \
        .select("submission_id") \
        .eq("project_id", project_id) \
        .execute()
    sub_ids = [s["submission_id"] for s in (sub_ids_res.data or [])]
    if sub_ids:
        admin_supabase.table("submission_slides") \
            .delete() \
            .in_("submission_id", sub_ids) \
            .execute()

    return {"message": "All submissions reset to pending.", "project_id": project_id}


@router.get("/submissions/{submission_id}/slides")
async def get_submission_slides(submission_id: str, current_user = Depends(get_current_user)):
    """Return all extracted slide data for a submission, ordered by slide number."""
    slides_res = (
        admin_supabase.table("submission_slides")
        .select("*")
        .eq("submission_id", submission_id)
        .order("slide_number")
        .execute()
    )
    return {"slides": slides_res.data or []}
