import os
import logging
import asyncio
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.database import admin_supabase
from app.celery_app import celery_app
from app.services.qdrant_service import qdrant_client, COLLECTION_NAME
from qdrant_client.http.models import PointStruct

logger = logging.getLogger(__name__)

from sentence_transformers import SentenceTransformer
_model = SentenceTransformer('all-MiniLM-L6-v2')

def get_model():
    """
    Worker-level global model loading.
    Loads the model into RAM (90MB) only once per worker.
    """
    global _model
    if _model is None:
        logger.info("[EmbeddingService] Loading SentenceTransformers model for the first time in this worker...")
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("[EmbeddingService] Model loaded successfully.")
        except ImportError:
            logger.error("sentence-transformers not installed.")
            raise
    return _model


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Workflow A: Problem Statement Embeddings
# ---------------------------------------------------------------------------

def embed_problem_statements(project_id: str, statements: List[Dict[str, Any]]):
    """
    Triggered when a project is created.
    Statements is a list of dictionaries containing statement_id, title, description, keywords.
    """
    model = get_model()
    
    if not qdrant_client:
        logger.error("[WorkflowA] Qdrant Client not available.")
        return

    points = []
    
    for ps in statements:
        # Build text
        title = ps.get("title", "")
        desc = ps.get("description", "")
        keywords = ps.get("tag", "")  # Or whatever keyword field is used
        
        combined_text = f"Problem Statement: {title}\nDescription: {desc}\nFocus Areas: {keywords}"
        
        # Generate embedding
        embedding = model.encode(combined_text)
        
        point_id = ps["statement_id"]
        
        points.append(
            PointStruct(
                id=str(point_id),
                vector={"text": embedding.tolist()},
                payload={
                    "granularity": "problem_statement",
                    "project_id": project_id,
                    "statement_id": point_id,
                    "title": title,
                    "description": desc[:200],  # Minimal text
                    "indexed_at": _now_iso()
                }
            )
        )
    
    # Upload to Qdrant Batch
    try:
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        logger.info(f"[WorkflowA] Successfully indexed {len(points)} problem statements to Qdrant.")
        
        # Update Supabase problem_statements
        for point in points:
            admin_supabase.table("problem_statements").update({
                "qdrant_point_id": point.id,
                "qdrant_indexed": True,
                "qdrant_indexed_at": _now_iso()
            }).eq("statement_id", point.id).execute()
            
    except Exception as e:
        logger.error(f"[WorkflowA] Failed to upload problem statements: {e}")


# ---------------------------------------------------------------------------
# Workflow B: Slide Embeddings (Celery Task)
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=3, queue="embedding")
def embed_submission_slides_task(self, submission_id: str):
    """
    Triggered via Celery task chain after PDF extraction finishes.
    Fetches all unindexed slides for a submission, embeds them in batch, and uploads to Qdrant.
    """
    model = get_model()
    
    if not qdrant_client:
        logger.error("[WorkflowB] Qdrant Client not available.")
        # Raise retry for timeout
        raise self.retry(countdown=5)

    # 1. Fetch submission data
    sub_res = admin_supabase.table("submissions").select("*").eq("submission_id", submission_id).single().execute()
    if not sub_res.data:
        logger.warning(f"[WorkflowB] Submission {submission_id} not found.")
        return
        
    submission = sub_res.data
    project_id = submission["project_id"]
    team_name = submission.get("team_name", "Unknown")

    # 2. Fetch unindexed slides
    slides_res = admin_supabase.table("submission_slides") \
        .select("*") \
        .eq("submission_id", submission_id) \
        .eq("qdrant_indexed", False) \
        .order("slide_number") \
        .execute()
        
    slides = slides_res.data or []
    
    if not slides:
        logger.info(f"[WorkflowB] No unindexed slides found for {submission_id}.")
        _update_job_status(submission_id, "embedding", "completed")  # ✅ valid job_type
        _check_all_indexed_and_trigger_categorize(project_id)
        return
        
    # 3. Batch Prepare Texts
    texts = []
    slide_ids = []
    
    for slide in slides:
        extracted = slide.get("text_content", "") or ""          # ✅ matches docling_extractor.py
        ocr = slide.get("images_ocr_text", "") or ""             # ✅ matches docling_extractor.py
        score = slide.get("complexity_score", 0.0)               # ✅ matches docling_extractor.py
        
        combined = f"Slide {slide.get('slide_number')}\nContent:\n{extracted}\nVisuals:\n{ocr}"
        texts.append(combined)
        slide_ids.append(slide["slide_id"])

    # 4. Batch Embed
    try:
        logger.info(f"[WorkflowB] Batch embedding {len(texts)} slides for {team_name}...")
        embeddings = model.encode(texts, batch_size=5, show_progress_bar=False)
        
        # 5. Create Qdrant Points
        points = []
        for i, slide in enumerate(slides):
            point_id = slide["slide_id"]
            points.append(
                PointStruct(
                    id=str(point_id),
                    vector={"text": embeddings[i].tolist()},
                    payload={
                        "granularity": "slide",
                        "project_id": project_id,
                        "submission_id": submission_id,
                        "slide_number": slide.get("slide_number"),
                        "team_name": team_name,
                        "complexity_score": slide.get("complexity_score", 0),
                        "indexed_at": _now_iso()
                    }
                )
            )
            
        # 6. Upload to Qdrant
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        
        # 7. Update Supabase
        for slide_id in slide_ids:
            admin_supabase.table("submission_slides").update({
                "qdrant_point_id": slide_id,
                "qdrant_indexed": True,
                "qdrant_indexed_at": _now_iso(),
                "embedding_model": "all-MiniLM-L6-v2",
                "embedding_version": 1
            }).eq("slide_id", slide_id).execute()
        
        _update_job_status(submission_id, "embedding", "completed")  # ✅ valid job_type
        _check_all_indexed_and_trigger_categorize(project_id)

    except Exception as e:
        logger.error(f"[WorkflowB] Failed embedding task for {submission_id}: {e}")
        _update_job_status(submission_id, "embedding", "failed", str(e))  # ✅ valid job_type
        raise self.retry(exc=e, countdown=15)


def _update_job_status(submission_id: str, job_type: str, status: str, error: str = None):
    """Updates the async processing_jobs state."""
    payload = {"status": status}
    if status == "completed":
        payload["completed_at"] = _now_iso()
        payload["progress_percentage"] = 100
    if error:
        payload["error_message"] = error
        
    admin_supabase.table("processing_jobs").update(payload) \
        .eq("submission_id", submission_id) \
        .eq("job_type", job_type).execute()

# ---------------------------------------------------------------------------
# Auto-Categorization (Option A)
# ---------------------------------------------------------------------------

def _check_all_indexed_and_trigger_categorize(project_id: str):
    subs = admin_supabase.table("submissions") \
        .select("submission_id, processing_status") \
        .eq("project_id", project_id) \
        .execute()
    submissions = subs.data or []

    if not submissions:
        return  # nothing to do

    all_indexed = True

    for s in submissions:
        sub_id = s["submission_id"]

        # ── Gate 1: skip submissions that failed — they will never have slides ──
        if s.get("processing_status") == "failed":
            continue

        # ── Gate 2: the submission must have AT LEAST one slide ──
        total_slides = admin_supabase.table("submission_slides") \
            .select("slide_id", count="exact") \
            .eq("submission_id", sub_id) \
            .execute()

        if not total_slides.count or total_slides.count == 0:
            # Extraction hasn't produced any slides yet — not ready
            all_indexed = False # <--- ADDED THIS
            break               # <--- ADDED THIS to stop the loop early
            
    if all_indexed and len(submissions) > 0:
        logger.info(f"[AutoCat] All submissions indexed for project {project_id}. Triggering Auto-Categorization.")
        auto_categorize_project_task.delay(project_id)


@celery_app.task(bind=True, queue="embedding")
def auto_categorize_project_task(self, project_id: str):
    """
    Once all submissions are indexed, this runs to auto-categorize.
    It averages the slide vectors for each submission, compares it with PS vectors, 
    and updates `detected_problem_statement_id` in Supabase.
    """
    if not qdrant_client:
        raise self.retry(countdown=5)
        
    try:
        import numpy as np
        
        # 1. Fetch PS Embeddings
        ps_results = qdrant_client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter={
                "must": [
                    {"key": "granularity", "match": {"value": "problem_statement"}},
                    {"key": "project_id", "match": {"value": project_id}}
                ]
            },
            with_vectors=True,
            limit=100
        )[0]
        
        # 2. Match each submission
        subs_res = admin_supabase.table("submissions").select("submission_id").eq("project_id", project_id).execute()
        submissions = subs_res.data or []

        if not ps_results:
            logger.warning(f"[AutoCat] No problem statement embeddings found for project {project_id}. "
                         f"Marking {len(submissions)} submissions as completed without categorization.")
            for sub in submissions:
                admin_supabase.table("submissions").update({
                    "detected_problem_statement_id": None,
                    "detection_confidence": None,
                    "processing_status": "processing" # Changed from completed to processing to continue to evaluation
                }).eq("submission_id", sub["submission_id"]).execute()
                
                # Trigger evaluation
                _trigger_evaluation_task(sub["submission_id"], project_id)
            return
            
        logger.info(f"[AutoCat] Found {len(ps_results)} problem statements. Categorizing {len(submissions)} submissions.")
        
        for sub in submissions:
            sub_id = sub["submission_id"]
            
            # Fetch Slide embeddings
            slide_results = qdrant_client.scroll(
                collection_name=COLLECTION_NAME,
                scroll_filter={
                    "must": [
                        {"key": "granularity", "match": {"value": "slide"}},
                        {"key": "submission_id", "match": {"value": sub_id}}
                    ]
                },
                with_vectors=True,
                limit=100
            )[0]
            
            if not slide_results:
                logger.warning(f"[AutoCat] No slides found for submission {sub_id}. Skipping categorization.")
                # We still trigger evaluation even if categorization fails
                _trigger_evaluation_task(sub_id, project_id)
                continue
                
            # Average vectors
            vectors = [pt.vector["text"] for pt in slide_results]
            sub_vector = np.mean(vectors, axis=0)
            
            # Cosine Sim
            best_ps_id = None
            best_score = -1.0
            
            for ps_pt in ps_results:
                ps_vec = np.array(ps_pt.vector["text"])
                # cos_sim = dot(u,v) / (norm(u)*norm(v))
                cos_sim = np.dot(sub_vector, ps_vec) / (np.linalg.norm(sub_vector) * np.linalg.norm(ps_vec))
                if cos_sim > best_score:
                    best_score = cos_sim
                    best_ps_id = ps_pt.payload.get("statement_id")
            
            # Apply threshold for Open Innovation vs Specific Problem Statement
            SIMILARITY_THRESHOLD = 0.35  # Adjust as needed based on empirical data
            
            # Keep processing_status = processing
            payload = {"processing_status": "processing"}
            if best_ps_id and best_score >= SIMILARITY_THRESHOLD:
                payload["detected_problem_statement_id"] = best_ps_id
                payload["detection_confidence"] = round(float(best_score), 4)
            else:
                # Treat as open innovation / theme-based (no strong match)
                payload["detected_problem_statement_id"] = None
                if best_score > -1.0:
                    payload["detection_confidence"] = round(float(best_score), 4)

            admin_supabase.table("submissions").update(payload).eq("submission_id", sub_id).execute()
            
            # Trigger Evaluation
            _trigger_evaluation_task(sub_id, project_id)
                
        logger.info(f"[AutoCat] Successfully categorized {len(submissions)} submissions for project {project_id}.")
        
    except Exception as e:
        logger.error(f"[AutoCat] Error categorizing project {project_id}: {e}")
        # FALLBACK: Enqueue evaluations anyway
        try:
            subs_fallback = admin_supabase.table("submissions").select("submission_id").eq("project_id", project_id).execute()
            for sub in (subs_fallback.data or []):
                _trigger_evaluation_task(sub["submission_id"], project_id)
            logger.info(f"[AutoCat] Fallback: Triggered evaluations despite categorization error.")
        except Exception as fallback_error:
            logger.error(f"[AutoCat] Fallback also failed: {fallback_error}")
            
        raise self.retry(exc=e, countdown=15)

def _trigger_evaluation_task(submission_id: str, project_id: str):
    """Inserts a processing job for evaluation and sends task."""
    try:
        # Check if evaluation job already exists
        job_res = admin_supabase.table("processing_jobs") \
            .select("job_id").eq("submission_id", submission_id) \
            .eq("job_type", "evaluation").execute()
            
        if not job_res.data:
            admin_supabase.table("processing_jobs").insert({
                "job_type": "evaluation",
                "submission_id": submission_id,
                "project_id": project_id,
                "status": "queued"
            }).execute()
        else:
            admin_supabase.table("processing_jobs").update({"status": "queued"}) \
                .eq("submission_id", submission_id) \
                .eq("job_type", "evaluation").execute()
                
        celery_app.send_task(
            "app.services.evaluation_service.evaluate_submission_task",
            args=[submission_id],
            queue="evaluation"
        )
    except Exception as e:
        logger.error(f"Failed to queue evaluation task for {submission_id}: {e}")

