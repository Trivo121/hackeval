import os
from celery import Celery

# Redis broker running locally for development/testing
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery("hackeval_tasks", broker=CELERY_BROKER_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_concurrency=4,  # Processing 4 at a time (as per plan)
    task_routes={
        "app.services.pdf_processor.process_submission_task": {"queue": "extraction"},
        "app.services.embedding_service.embed_submission_slides_task": {"queue": "embedding"},
        "app.services.embedding_service.auto_categorize_project_task": {"queue": "embedding"},
        "app.services.evaluation_service.evaluate_submission_task": {"queue": "evaluation"}
    }
)

# Optional: Autodiscover tasks so workers don't need manual imports
celery_app.autodiscover_tasks(["app.services.embedding_service", "app.services.pdf_processor", "app.services.evaluation_service"])
