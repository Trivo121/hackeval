import asyncio
from app.services.evaluation_service import evaluate_submission_task

# Using a real submission ID from your database
submission_uuid = "c10b8667-1e67-47ef-9ecd-a2da8e0357cd"

print("🔥 Firing up the HackEval AWS Evaluation Pipeline...")
try:
    result = evaluate_submission_task.delay(submission_id=submission_uuid)
    print(f"✅ Task shipped to Celery! Tracking ID: {result.id}")
    print("Wait for the logs in your Celery terminal to see the AI feedback.")
except Exception as e:
    print(f"❌ Failed to queue task: {e}")
