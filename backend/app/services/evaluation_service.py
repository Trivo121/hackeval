import os
import logging
import httpx
from datetime import datetime, timezone
import re
from typing import Dict, Any, List

from app.database import admin_supabase
from app.celery_app import celery_app

logger = logging.getLogger(__name__)

from dotenv import load_dotenv
load_dotenv()

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://3.110.43.22:8000/v1")
VLLM_API_URL = f"{PROMETHEUS_URL}/chat/completions"
VLLM_MODEL = os.getenv("VLLM_MODEL", "prometheus-eval/prometheus-7b-v2.0")

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _update_job_status(submission_id: str, job_type: str, status: str, error: str = None, progress: int = None):
    """Updates the async processing_jobs state."""
    payload = {"status": status}
    if status == "completed":
        payload["completed_at"] = _now_iso()
        payload["progress_percentage"] = 100
    if status == "running" and progress is not None:
        payload["progress_percentage"] = progress
    if error:
        payload["error_message"] = error
        
    admin_supabase.table("processing_jobs").update(payload) \
        .eq("submission_id", submission_id) \
        .eq("job_type", job_type).execute()

def build_prometheus_prompt(instruction: str, response: str, criterion_name: str) -> str:
    """Builds the absolute grading prompt expected by Prometheus-Eval."""
    
    score_rubric = f"""[{criterion_name}]
Score 1: Very poor {criterion_name}.
Score 2: Below average {criterion_name}.
Score 3: Average {criterion_name}.
Score 4: Good {criterion_name}.
Score 5: Excellent and outstanding {criterion_name}."""

    prompt = f"""###Task Description:
An instruction (might include an Input inside it), a response to evaluate, and a score rubric representing a evaluation criteria are given.
1. Write a detailed feedback that assess the quality of the response strictly based on the given score rubric, not evaluating in general.
2. After writing a feedback, write a score that is an integer between 1 and 5. You should refer to the score rubric.
3. The output format should look as follows: "Feedback: (write a feedback for criteria) [RESULT] (an integer number between 1 and 5)"
4. Please do not generate any other opening, closing, and explanations. Be sure to include [RESULT] in your output.

###The instruction to evaluate:
{instruction}

###Response to evaluate:
{response}

###Score Rubrics:
{score_rubric}

###Feedback:"""
    return prompt

def evaluate_with_prometheus(prompt: str) -> Dict[str, Any]:
    """Call the AWS vLLM instance."""
    try:
        response = httpx.post(
            VLLM_API_URL, 
            json={
                "model": VLLM_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1024,
                "temperature": 0.1
            },
            timeout=120.0
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        
        # Parse output format: Feedback: ... [RESULT] X
        # Some models might not include "Feedback:" string exactly or might vary.
        # We look for [RESULT] \d
        
        score_match = re.search(r"\[RESULT\]\s*(\d+)", content)
        if score_match:
            score = int(score_match.group(1))
            # Extract feedback before result
            feedback = content.split("[RESULT]")[0].replace("Feedback:", "").strip()
        else:
            score = 3  # Fallback
            feedback = content
            
        # Bound the score between 1 and 5
        score = max(1, min(5, score))
        return {"score": score, "feedback": feedback, "raw": content}

    except Exception as e:
        logger.error(f"vLLM API Error: {e}")
        # Default fallback
        return {"score": 3, "feedback": f"Evaluation failed due to server error: {e}", "raw": ""}

@celery_app.task(bind=True, max_retries=3, queue="evaluation")
def evaluate_submission_task(self, submission_id: str):
    """
    Evaluates a submission against the project's scoring criteria using Prometheus-7B.
    """
    logger.info(f"[EvaluationService] Starting evaluation for {submission_id}")
    
    # 1. Update job to running
    _update_job_status(submission_id, "evaluation", "running", progress=10)
    
    try:
        # 2. Fetch Submission & Project Details
        sub_res = admin_supabase.table("submissions").select("*").eq("submission_id", submission_id).single().execute()
        if not sub_res.data:
            raise ValueError(f"Submission {submission_id} not found.")
        submission = sub_res.data
        project_id = submission["project_id"]
        
        # 3. Fetch Scoring Criteria
        criteria_res = admin_supabase.table("scoring_criteria").select("*").eq("project_id", project_id).execute()
        criteria = criteria_res.data or []
        if not criteria:
            logger.warning(f"No scoring criteria for project {project_id}. Skipping evaluation.")
            _update_job_status(submission_id, "evaluation", "completed")
            admin_supabase.table("submissions").update({"processing_status": "completed"}).eq("submission_id", submission_id).execute()
            return

        # 4. Fetch Submission Slides to form the response
        slides_res = admin_supabase.table("submission_slides").select("*").eq("submission_id", submission_id).order("slide_number").execute()
        slides = slides_res.data or []
        response_text = ""
        for slide in slides:
            content = slide.get("text_content", "") or ""
            ocr = slide.get("images_ocr_text", "") or ""
            response_text += f"\nSlide {slide.get('slide_number')}:\n{content}\n{ocr}\n"
        
        if not response_text.strip():
            response_text = "No content could be extracted from this submission."

        # Limit response length to prevent hitting context limits (~6k words)
        response_text = response_text[:20000] 

        # 5. Fetch Problem Statement Context (if detected)
        instruction = "Evaluate the following hackathon submission."
        ps_id = submission.get("detected_problem_statement_id")
        if ps_id:
            ps_res = admin_supabase.table("problem_statements").select("*").eq("statement_id", ps_id).single().execute()
            if ps_res.data:
                instruction = f"Evaluate the following hackathon submission based on this Problem Statement:\nTitle: {ps_res.data.get('title')}\nDescription: {ps_res.data.get('description')}"

        # 6. Evaluate Each Criterion
        total_criteria = len(criteria)
        for idx, criterion in enumerate(criteria):
            logger.info(f"Evaluating {criterion['criterion_name']} for {submission_id}...")
            
            prompt = build_prometheus_prompt(
                instruction=instruction,
                response=response_text,
                criterion_name=criterion["criterion_name"]
            )
            
            ai_result = evaluate_with_prometheus(prompt)
            
            # Save into DB
            admin_supabase.table("evaluation_scores").insert({
                "submission_id": submission_id,
                "criterion_id": criterion["criterion_id"],
                "score": ai_result["score"],
                "feedback": ai_result["feedback"]
            }).execute()
            
            # Update Progress
            progress = 10 + int((idx + 1) / total_criteria * 80)
            _update_job_status(submission_id, "evaluation", "running", progress=progress)

        # 7. Mark as complete
        _update_job_status(submission_id, "evaluation", "completed")
        admin_supabase.table("submissions").update({
            "processing_status": "completed",
            "updated_at": _now_iso()
        }).eq("submission_id", submission_id).execute()
        
        logger.info(f"[EvaluationService] Finished evaluation for {submission_id} ✅")

    except Exception as e:
        logger.error(f"[EvaluationService] Evaluation failed for {submission_id}: {e}")
        _update_job_status(submission_id, "evaluation", "failed", str(e))
        admin_supabase.table("submissions").update({
            "processing_status": "failed",
            "updated_at": _now_iso()
        }).eq("submission_id", submission_id).execute()
        raise self.retry(exc=e, countdown=30)
