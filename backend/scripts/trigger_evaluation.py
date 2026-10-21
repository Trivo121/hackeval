"""Manually queue one evaluation: python scripts/trigger_evaluation.py <submission-uuid>

Runs from backend/ (imports app.*), or set HACK_EVAL_SUBMISSION_UUID instead
of passing an argument. Development helper — not part of the test suite.
"""
import os
import sys

from app.services.evaluation_service import evaluate_submission_task


def main() -> None:
    submission_uuid = (sys.argv[1] if len(sys.argv) > 1 else "") or os.environ.get(
        "HACK_EVAL_SUBMISSION_UUID", ""
    )

    if not submission_uuid:
        print("Usage: python scripts/trigger_evaluation.py <submission-uuid>")
        print("   or: set HACK_EVAL_SUBMISSION_UUID=<uuid> and run without arguments")
        sys.exit(2)

    print("Firing up the HackEval AWS Evaluation Pipeline...")
    try:
        result = evaluate_submission_task.delay(submission_id=submission_uuid)
        print(f"Task shipped to Celery! Tracking ID: {result.id}")
        print("Wait for the logs in your Celery terminal to see the AI feedback.")
    except Exception as e:
        print(f"Failed to queue task: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
