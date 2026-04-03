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

import logging
from datetime import datetime, timezone
from io import BytesIO

from app.database import admin_supabase
from app.services.google_drive import stream_pdf_bytes_sync   # ✅ sync version
from app.services.docling_extractor import _sync_extract_pdf, _store_slides_sync  # ✅ sync internals

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

from app.celery_app import celery_app

@celery_app.task(bind=True, max_retries=3, queue="extraction")
def process_submission_task(self, submission_id: str, project_id: str) -> None:
    """
    Main background worker entrypoint (Celery Task).
    Processes a single submission through the pipeline starting with Step 1: Fetch.
    NOTE: Celery tasks are synchronous — we use sync versions of all I/O calls.
    """
    print(f"\n{'='*60}")
    print(f"[Worker] Starting extraction task for submission_id={submission_id}")
    print(f"{'='*60}")

    # Fetch submission details to get drive_file_id and team_name
    try:
        sub_res = (
            admin_supabase
            .table("submissions")
            .select("drive_file_id, drive_file_name, team_name")
            .eq("submission_id", submission_id)
            .single()
            .execute()
        )
        if not sub_res.data:
            print(f"[Worker] ERROR: Submission {submission_id} not found in DB.")
            return
        
        drive_file_id = sub_res.data["drive_file_id"]
        team_name = sub_res.data.get("team_name", "Unknown Team")
        file_name = sub_res.data.get("drive_file_name", "unknown.pdf")
    except Exception as e:
        print(f"[Worker] ERROR: Could not fetch submission {submission_id} from DB: {e}")
        raise self.retry(exc=e, countdown=10)

    print(f"[Worker] ── Processing: '{team_name}' ({file_name})")

    # ✅ Step 1: Fetch — fully synchronous, no asyncio.run()
    try:
        pdf_bytes = _fetch_single_submission_sync(
            submission_id=submission_id,
            drive_file_id=drive_file_id,
            project_id=project_id,
        )
    except Exception as e:
        logger.error(f"[Worker] Failed during _fetch_single_submission_sync for {submission_id}: {e}")
        raise self.retry(exc=e, countdown=20)

    if pdf_bytes is not None:
        # ── Step 2: Extract with PyMuPDF/EasyOCR ──
        print(f"[Worker] ── Step 2/Extract: running extraction on '{team_name}'")
        try:
            # ✅ Call the internal sync function directly — no asyncio.run() needed
            slide_records = _sync_extract_pdf(pdf_bytes, submission_id, project_id)
            extract_ok = _store_slides_sync(slide_records, submission_id) if slide_records else False
        except Exception as e:
            logger.error(f"[Worker] Failed during extraction for {submission_id}: {e}")
            extract_ok = False

        if extract_ok:
            # Mark extraction as complete — stay in 'processing' since embedding still needs to run
            # (DB CHECK constraint: pending|queued|processing|completed|failed — 'extracted' is NOT allowed)
            try:
                admin_supabase.table("submissions").update({
                    "processing_status": "processing",  # ✅ valid DB status
                    "updated_at": _now_iso()
                }).eq("submission_id", submission_id).execute()
                print(f"[Worker]    ✅ '{team_name}' → slides extracted, queuing embedding task.")

                # Upsert the embedding job row so the progress endpoint can track it
                # job_type must be 'embedding' per DB CHECK constraint (not 'embed_submission_slides')
                job_res = admin_supabase.table("processing_jobs").select("job_id") \
                    .eq("submission_id", submission_id) \
                    .eq("job_type", "embedding") \
                    .execute()
                if not job_res.data:
                    admin_supabase.table("processing_jobs").insert({
                        "job_type": "embedding",
                        "submission_id": submission_id,
                        "project_id": project_id,
                        "status": "queued"
                    }).execute()
                else:
                    admin_supabase.table("processing_jobs").update({"status": "queued"}) \
                        .eq("submission_id", submission_id) \
                        .eq("job_type", "embedding") \
                        .execute()

                celery_app.send_task(
                    "app.services.embedding_service.embed_submission_slides_task",
                    args=[submission_id],
                    queue="embedding"
                )
            except Exception as e:
                logger.warning(f"[Worker] Could not mark submission processing or queue embedding: {e}")
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
    else:
        print(f"[Worker]    ❌ '{team_name}' → fetch failed")

    # --- Update project status after processing ---
    try:
        admin_supabase.table("projects").update({
            "status": "active",
            "updated_at": _now_iso()
        }).eq("project_id", project_id).execute()
    except Exception as e:
        print(f"[Worker] WARNING: Could not update project status: {e}")

    print(f"\n[Worker] ✅ Done processing task for {submission_id}")
    print(f"{'='*60}\n")


# ---------------------------------------------------------------------------
# Step 1: Fetch (SYNC — safe to call from Celery tasks)
# ---------------------------------------------------------------------------

def _fetch_single_submission_sync(
    submission_id: str,
    drive_file_id: str,
    project_id: str,
) -> BytesIO | None:
    """
    Step 1 — Fetch (synchronous version for Celery workers):
      1. Find the matching pdf_extraction job in processing_jobs
      2. Mark submission processing_status = 'processing'
      3. Mark job status = 'running', set started_at
      4. Download PDF bytes from Google Drive → BytesIO (sync httpx.Client)
      5. Mark job status = 'completed' or 'failed'

    Returns a BytesIO (rewound to position 0) on success, or None on failure.
    """

    # ── 1. Look up the processing job for this submission ──
    job_id = _get_job_id_sync(submission_id, project_id, job_type="pdf_extraction")

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

    # ── 4. Download PDF bytes from Drive (sync) ──
    pdf_bytes = stream_pdf_bytes_sync(drive_file_id)

    # ── 5. Update DB based on result ──
    if pdf_bytes is not None:
        if job_id:
            try:
                admin_supabase.table("processing_jobs").update({
                    "status": "completed",
                    "completed_at": _now_iso()
                }).eq("job_id", job_id).execute()
                print(f"  [Step1/Fetch] job_id={job_id} → status=completed ✅")
            except Exception as e:
                print(f"  [Step1/Fetch] WARNING: Could not mark job completed: {e}")

        return pdf_bytes

    else:
        try:
            admin_supabase.table("submissions").update({
                "processing_status": "failed",
                "updated_at": _now_iso()
            }).eq("submission_id", submission_id).execute()
        except Exception as e:
            print(f"  [Step1/Fetch] WARNING: Could not mark submission failed: {e}")

        if job_id:
            try:
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
                        "error_message": f"Failed to download PDF from Drive (file_id={drive_file_id})",
                        "completed_at": _now_iso() if new_status == "failed" else None
                    }).eq("job_id", job_id).execute()

                    print(f"  [Step1/Fetch] job_id={job_id} → status={new_status} ❌ (retry {new_retry_count}/{max_retries})")
            except Exception as e:
                print(f"  [Step1/Fetch] WARNING: Could not update job on failure: {e}")

        return None


# ---------------------------------------------------------------------------
# Helpers (sync)
# ---------------------------------------------------------------------------

def _get_job_id_sync(submission_id: str, project_id: str, job_type: str) -> str | None:
    """Synchronous version — looks up a queued processing_job for a given submission."""
    try:
        res = (
            admin_supabase
            .table("processing_jobs")
            .select("job_id")
            .eq("submission_id", submission_id)
            .eq("project_id", project_id)
            .eq("job_type", job_type)
            .eq("status", "queued")
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
