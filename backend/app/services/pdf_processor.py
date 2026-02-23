"""
pdf_processor.py — Background Worker for PDF Processing Pipeline

Step 1: FETCH
  - Loop through all `pending` submissions for a project
  - Mark processing_jobs status = 'running' and submissions = 'processing'
  - Stream PDF bytes from Google Drive into a BytesIO object
  - Mark processing_jobs status = 'completed' or 'failed'

Step 2: EXTRACT (Docling)
  - Parse PDF BytesIO with Docling (runs in thread pool — CPU-bound)
  - Extract per-page: text, tables (markdown+csv), image OCR, layout metadata
  - Bulk-insert into `submission_slides` Supabase table
  - On success → submission.processing_status = 'completed'
  - On failure → submission.processing_status = 'failed'
"""

import asyncio
import logging
from datetime import datetime, timezone
from io import BytesIO

from app.database import admin_supabase
from app.services.google_drive import stream_pdf_bytes
from app.services.docling_extractor import extract_submission_slides

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

async def process_submissions_background(project_id: str) -> None:
    """
    Main background worker entrypoint.
    Fetches all 'pending' submissions for the project and processes them
    one by one through the pipeline starting with Step 1: Fetch.
    
    This function is designed to be passed to FastAPI BackgroundTasks.
    """
    print(f"\n{'='*60}")
    print(f"[Worker] Starting processing for project_id={project_id}")
    print(f"{'='*60}")

    # --- Fetch all pending submissions for this project ---
    try:
        submissions_res = (
            admin_supabase
            .table("submissions")
            .select("submission_id, drive_file_id, drive_file_name, team_name")
            .eq("project_id", project_id)
            .eq("processing_status", "pending")
            .execute()
        )
        submissions = submissions_res.data or []
    except Exception as e:
        print(f"[Worker] ERROR: Could not fetch submissions from DB: {e}")
        return

    if not submissions:
        print(f"[Worker] No pending submissions found for project_id={project_id}. Exiting.")
        return

    print(f"[Worker] Found {len(submissions)} pending submissions. Beginning fetch loop...\n")

    # --- Process each submission sequentially ---
    success_count = 0
    fail_count = 0

    for submission in submissions:
        submission_id = submission["submission_id"]
        drive_file_id = submission["drive_file_id"]
        team_name = submission.get("team_name", "Unknown Team")
        file_name = submission.get("drive_file_name", "unknown.pdf")

        print(f"[Worker] ── Processing: '{team_name}' ({file_name})")

        pdf_bytes = await _fetch_single_submission(
            submission_id=submission_id,
            drive_file_id=drive_file_id,
            project_id=project_id,
        )

        if pdf_bytes is not None:
            # ── Step 2: Extract with Docling ──
            print(f"[Worker] ── Step 2/Extract: running Docling on '{team_name}'")
            extract_ok = await extract_submission_slides(
                pdf_bytes=pdf_bytes,
                submission_id=submission_id,
                project_id=project_id,
            )

            if extract_ok:
                # Mark submission as fully done
                try:
                    admin_supabase.table("submissions").update({
                        "processing_status": "completed",
                        "updated_at": _now_iso()
                    }).eq("submission_id", submission_id).execute()
                    print(f"[Worker]    ✅ '{team_name}' → completed")
                except Exception as e:
                    logger.warning(f"[Worker] Could not mark submission completed: {e}")
                success_count += 1
            else:
                # Extraction failed → mark submission as failed
                try:
                    admin_supabase.table("submissions").update({
                        "processing_status": "failed",
                        "updated_at": _now_iso()
                    }).eq("submission_id", submission_id).execute()
                    print(f"[Worker]    ❌ '{team_name}' → extraction failed")
                except Exception as e:
                    logger.warning(f"[Worker] Could not mark submission failed (extract): {e}")
                fail_count += 1
        else:
            fail_count += 1

    # --- Update project status after processing ---
    try:
        admin_supabase.table("projects").update({
            "status": "active",
            "updated_at": _now_iso()
        }).eq("project_id", project_id).execute()
    except Exception as e:
        print(f"[Worker] WARNING: Could not update project status: {e}")

    print(f"\n[Worker] ✅ Done. Success={success_count} | Failed={fail_count}")
    print(f"{'='*60}\n")


# ---------------------------------------------------------------------------
# Step 1: Fetch
# ---------------------------------------------------------------------------

async def _fetch_single_submission(
    submission_id: str,
    drive_file_id: str,
    project_id: str,
) -> BytesIO | None:
    """
    Step 1 — Fetch:
      1. Find the matching pdf_extraction job in processing_jobs
      2. Mark submission processing_status = 'processing'
      3. Mark job status = 'running', set started_at
      4. Stream PDF bytes from Google Drive → BytesIO
      5. Mark job status = 'completed' or 'failed' + update submission on failure
    
    Returns a BytesIO (rewound to position 0) on success, or None on failure.
    """

    # ── 1. Look up the processing job for this submission ──
    job_id = await _get_job_id(submission_id, project_id, job_type="pdf_extraction")

    # ── 2. Mark submission as 'processing' ──
    try:
        admin_supabase.table("submissions").update({
            "processing_status": "processing",
            "updated_at": _now_iso()
        }).eq("submission_id", submission_id).execute()
        print(f"  [Step1/Fetch] submission_id={submission_id} → status=processing")
    except Exception as e:
        print(f"  [Step1/Fetch] WARNING: Could not update submission status: {e}")

    # ── 3. Mark job as 'running' ──
    if job_id:
        try:
            admin_supabase.table("processing_jobs").update({
                "status": "running",
                "started_at": _now_iso()
            }).eq("job_id", job_id).execute()
            print(f"  [Step1/Fetch] job_id={job_id} → status=running")
        except Exception as e:
            print(f"  [Step1/Fetch] WARNING: Could not update job to running: {e}")

    # ── 4. Stream PDF bytes from Drive ──
    pdf_bytes = await stream_pdf_bytes(drive_file_id)

    # ── 5. Update DB based on result ──
    if pdf_bytes is not None:
        # Success
        if job_id:
            try:
                admin_supabase.table("processing_jobs").update({
                    "status": "completed",
                    "completed_at": _now_iso()
                }).eq("job_id", job_id).execute()
                print(f"  [Step1/Fetch] job_id={job_id} → status=completed ✅")
            except Exception as e:
                print(f"  [Step1/Fetch] WARNING: Could not mark job completed: {e}")

        return pdf_bytes  # Hand off to Step 2

    else:
        # Failure — update submission + job
        try:
            admin_supabase.table("submissions").update({
                "processing_status": "failed",
                "updated_at": _now_iso()
            }).eq("submission_id", submission_id).execute()
        except Exception as e:
            print(f"  [Step1/Fetch] WARNING: Could not mark submission failed: {e}")

        if job_id:
            try:
                # Check retry logic
                job_res = admin_supabase.table("processing_jobs").select(
                    "retry_count, max_retries"
                ).eq("job_id", job_id).single().execute()

                if job_res.data:
                    retry_count = job_res.data["retry_count"]
                    max_retries = job_res.data["max_retries"]
                    new_status = "queued" if retry_count < max_retries else "failed"
                    new_retry_count = retry_count + 1

                    admin_supabase.table("processing_jobs").update({
                        "status": new_status,
                        "retry_count": new_retry_count,
                        "error_message": f"Failed to stream PDF from Drive (file_id={drive_file_id})",
                        "completed_at": _now_iso() if new_status == "failed" else None
                    }).eq("job_id", job_id).execute()

                    print(f"  [Step1/Fetch] job_id={job_id} → status={new_status} ❌ (retry {new_retry_count}/{max_retries})")
            except Exception as e:
                print(f"  [Step1/Fetch] WARNING: Could not update job on failure: {e}")

        return None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_job_id(submission_id: str, project_id: str, job_type: str) -> str | None:
    """
    Looks up the processing_job for a given submission + job_type.
    Returns the job_id string or None if not found.
    """
    try:
        res = (
            admin_supabase
            .table("processing_jobs")
            .select("job_id")
            .eq("submission_id", submission_id)
            .eq("project_id", project_id)
            .eq("job_type", job_type)
            .eq("status", "queued")  # Only pick up queued jobs
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0]["job_id"]
    except Exception as e:
        print(f"  [Helper] Could not fetch job_id for submission_id={submission_id}: {e}")
    return None


def _now_iso() -> str:
    """Returns the current UTC time as an ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()
