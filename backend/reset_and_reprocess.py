"""
One-time script: Reset submissions to 'pending' and trigger reprocessing.
"""
import os, sys, asyncio
sys.path.insert(0, ".")
os.environ["HF_HOME"] = "D:/hf_cache"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

from dotenv import load_dotenv
load_dotenv()

from app.database import admin_supabase
from app.services.pdf_processor import process_submissions_background

PROJECT_ID = "1ccd4eb9-68af-41ec-bfdf-1b3b7abb749e"

def main():
    # 1. Reset all submissions to pending
    print("=== Step 1: Resetting submissions to 'pending' ===")
    admin_supabase.table("submissions") \
        .update({"processing_status": "pending"}) \
        .eq("project_id", PROJECT_ID) \
        .execute()

    # 2. Delete old slides
    sub_ids_res = admin_supabase.table("submissions") \
        .select("submission_id") \
        .eq("project_id", PROJECT_ID) \
        .execute()
    sub_ids = [s["submission_id"] for s in (sub_ids_res.data or [])]
    print(f"Found {len(sub_ids)} submissions. Deleting old slides...")
    if sub_ids:
        admin_supabase.table("submission_slides") \
            .delete() \
            .in_("submission_id", sub_ids) \
            .execute()

    # 3. Verify reset
    res = admin_supabase.table("submissions") \
        .select("team_name, processing_status") \
        .eq("project_id", PROJECT_ID) \
        .execute()
    for s in res.data:
        print(f"  {s['team_name']}: {s['processing_status']}")

    # 4. Trigger reprocessing
    print("\n=== Step 2: Starting reprocessing ===")
    asyncio.run(process_submissions_background(PROJECT_ID))
    print("\n=== DONE ===")

if __name__ == "__main__":
    main()
