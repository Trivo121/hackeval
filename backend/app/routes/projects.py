from fastapi import APIRouter, Depends, Header, BackgroundTasks, HTTPException
from app.services.auth import get_current_user
from app.services.projects import create_project_in_db
from app.services.google_drive import list_files_in_folder, scan_and_store_submissions
from app.celery_app import celery_app
from app.schemas import ProjectCreateRequest, ProjectResponse, ProcessingStartResponse, ParseRubricRequest
from app.database import admin_supabase
import re
import httpx
import os

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


@router.post("/projects/parse-rubric")
async def parse_rubric(req: ParseRubricRequest, current_user = Depends(get_current_user)):
    """
    Parses a raw text rubric into JSON scoring criteria using Groq's Llama 3.1 8B Instant.
    """
    groq_api_key = os.getenv("GROQ_API")
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API key not configured.")
    
    prompt = f"""Parse the following hackathon rubric or evaluation description into a JSON array of scoring criteria.

Each criterion must have:
- "name": short label (max 4 words)
- "description": full description of what this criterion measures (copy verbatim from source where possible, minimum 80 characters)
- "weight": integer percentage (weights must sum to exactly 100; if not stated, distribute evenly)

Rules:
- Return ONLY a valid JSON array, no markdown, no preamble, no explanation
- Never include a "Total" or summary row as a criterion
- Minimum 2 criteria, maximum 7 criteria

Rubric text:
{req.raw_text}"""

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key.strip()}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1
                },
                timeout=30.0
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Request to Groq failed: {str(e)}")

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"Groq API error: {response.text}")

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return {"content": content}


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

    # Fetch pending submissions so we can report back right away and queue them
    pending_res = (
        admin_supabase.table("submissions")
        .select("submission_id")
        .eq("project_id", project_id)
        .eq("processing_status", "pending")
        .execute()
    )
    
    pending_submissions = pending_res.data or []
    pending_count = len(pending_submissions)

    if pending_count == 0:
        return ProcessingStartResponse(
            message="No pending submissions to process.",
            project_id=project_id,
            queued=0
        )

    # For each pending submission: create the pdf_extraction job row FIRST, then fire Celery.
    # This ensures _get_job_id_sync() inside the worker can find the row immediately.
    for sub in pending_submissions:
        sub_id = sub["submission_id"]
        try:
            # Upsert the pdf_extraction job row (Bug 3 fix: it was never created here before)
            existing_job = admin_supabase.table("processing_jobs") \
                .select("job_id") \
                .eq("submission_id", sub_id) \
                .eq("job_type", "pdf_extraction") \
                .execute()
            if not existing_job.data:
                admin_supabase.table("processing_jobs").insert({
                    "job_type": "pdf_extraction",
                    "submission_id": sub_id,
                    "project_id": project_id,
                    "status": "queued"
                }).execute()
            else:
                # Reset to queued if it already exists (e.g. after a reset-submissions)
                admin_supabase.table("processing_jobs").update({"status": "queued"}) \
                    .eq("submission_id", sub_id) \
                    .eq("job_type", "pdf_extraction") \
                    .execute()
        except Exception as e:
            # Non-fatal — worker will still run, just won't have job tracking
            print(f"[start-processing] WARNING: Could not upsert pdf_extraction job for {sub_id}: {e}")

        celery_app.send_task(
            "app.services.pdf_processor.process_submission_task",
            args=[sub_id, project_id],
            queue="extraction"
        )

    return ProcessingStartResponse(
        message=f"Processing started for {pending_count} submission(s).",
        project_id=project_id,
        queued=pending_count
    )


@router.post("/projects/{project_id}/reset-submissions")
async def reset_submissions(project_id: str, current_user = Depends(get_current_user)):
    """
    Reset all submissions to 'pending', wipe old slides + processing_jobs,
    then immediately queue fresh extraction tasks — all in one call.
    (Bug 1 fix: previously only reset status, never queued any tasks.)
    """
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

    # 1. Fetch all submission IDs for this project
    sub_ids_res = admin_supabase.table("submissions") \
        .select("submission_id") \
        .eq("project_id", project_id) \
        .execute()
    sub_ids = [s["submission_id"] for s in (sub_ids_res.data or [])]

    if not sub_ids:
        return {"message": "No submissions found.", "project_id": project_id, "queued": 0}

    # 2. Delete old slides
    admin_supabase.table("submission_slides") \
        .delete() \
        .in_("submission_id", sub_ids) \
        .execute()

    # 3. Delete stale processing_jobs so progress tracking starts fresh
    admin_supabase.table("processing_jobs") \
        .delete() \
        .in_("submission_id", sub_ids) \
        .execute()

    # 4. Reset all submissions to 'pending'
    admin_supabase.table("submissions") \
        .update({"processing_status": "pending"}) \
        .eq("project_id", project_id) \
        .execute()

    # 5. Create pdf_extraction job rows + queue Celery tasks
    #    (Same logic as start-processing — Bug 1: this was completely missing before)
    queued = 0
    for sub_id in sub_ids:
        try:
            admin_supabase.table("processing_jobs").insert({
                "job_type": "pdf_extraction",
                "submission_id": sub_id,
                "project_id": project_id,
                "status": "queued"
            }).execute()
        except Exception as e:
            print(f"[reset-submissions] WARNING: Could not create pdf_extraction job for {sub_id}: {e}")

        celery_app.send_task(
            "app.services.pdf_processor.process_submission_task",
            args=[sub_id, project_id],
            queue="extraction"
        )
        queued += 1

    return {
        "message": f"Reset complete. {queued} submission(s) queued for re-processing.",
        "project_id": project_id,
        "queued": queued
    }


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

@router.get("/projects/{project_id}/embedding-progress")
async def get_embedding_progress(project_id: str, current_user = Depends(get_current_user)):
    """Return real-time metrics on the extraction, embedding, and categorization progress."""
    try:
        # Total Submissions
        total_res = admin_supabase.table("submissions").select("submission_id", count="exact").eq("project_id", project_id).execute()
        total = total_res.count or 0

        if total == 0:
            return {"total_submissions": 0, "extraction_complete": 0, "embedding_complete": 0, "categorization_complete": 0}

        # Extracted (or higher)
        extracted_res = admin_supabase.table("submissions").select("submission_id", count="exact").eq("project_id", project_id).neq("processing_status", "pending").execute()
        # Anything past 'pending' (e.g., extracted, indexed, categorized) has been extracted
        extracted = extracted_res.count or 0

        # Categorized — 'completed' is the final status after auto-categorization runs
        # ('categorized' was the old value but is NOT in the DB CHECK constraint)
        cat_res = admin_supabase.table("submissions").select("submission_id", count="exact").eq("project_id", project_id).eq("processing_status", "completed").execute()
        categorized = cat_res.count or 0

        # Embedded: look up processing_jobs where job_type='embedding' (not 'embed_submission_slides')
        emb_res = admin_supabase.table("processing_jobs").select("job_id", count="exact").eq("project_id", project_id).eq("job_type", "embedding").eq("status", "completed").execute()
        embedded = emb_res.count or 0
        
        # Calculate ETA (rough estimate: 2s per remaining extraction, 2s per remaining embedding)
        remaining_extracts = total - extracted
        remaining_embeds = total - embedded
        eta_seconds = (remaining_extracts * 2) + (remaining_embeds * 2)

        return {
            "total_submissions": total,
            "extraction_complete": extracted,
            "embedding_complete": embedded,
            "categorization_complete": categorized,
            "eta_seconds": eta_seconds
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/projects/{project_id}/recover-stuck")
async def recover_stuck(project_id: str, current_user = Depends(get_current_user)):
    """Re-queue any submission stuck in 'processing' for more than 30 minutes."""
    from datetime import datetime, timezone, timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()

    stuck = admin_supabase.table("submissions") \
        .select("submission_id") \
        .eq("project_id", project_id) \
        .eq("processing_status", "processing") \
        .lt("updated_at", cutoff) \
        .execute()

    requeued = 0
    for sub in (stuck.data or []):
        admin_supabase.table("submissions").update({
            "processing_status": "pending", "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("submission_id", sub["submission_id"]).execute()
        celery_app.send_task(
            "app.services.pdf_processor.process_submission_task",
            args=[sub["submission_id"], project_id], queue="extraction"
        )
        requeued += 1

    return {"requeued": requeued, "project_id": project_id}
