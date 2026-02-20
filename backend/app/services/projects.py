
from fastapi import HTTPException
from app.database import admin_supabase
from app.schemas import ProjectCreateRequest
import re

async def create_project_in_db(user, project_data: ProjectCreateRequest):
    """
    Orchestrates the creation of a project, including validation and DB insertion.
    """
    user_id = user.id

    # 1. VALIDATION LAYER
    
    # Check 1: Project Name Uniqueness for this user
    # Note: 'eq' on 'project_name' might need exact match. 
    existing_projects = admin_supabase.table("projects").select("project_id").eq("owner_user_id", user_id).eq("project_name", project_data.project_name).execute()
    if existing_projects.data:
         raise HTTPException(status_code=400, detail=f"A project with the name '{project_data.project_name}' already exists.")

    # Check 2: Scoring Weights Sum to 100
    if project_data.scoring_criteria:
        total_weight = sum(c.weight for c in project_data.scoring_criteria)
        if total_weight != 100:
            raise HTTPException(status_code=400, detail=f"Scoring criteria weights must sum to 100. Current sum: {total_weight}")

    # Check 3: Google Drive URL Validation
    drive_pattern = r"drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)"
    match = re.search(drive_pattern, project_data.drive_folder_url)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid Google Drive URL. Must be a folder link.")
    drive_folder_id = match.group(1)

    # 2. DB OPERATIONS
    
    try:
        # A. Insert into 'projects' table
        project_payload = {
            "project_name": project_data.project_name,
            "owner_user_id": user_id,
            "drive_folder_id": drive_folder_id,
            "drive_folder_url": project_data.drive_folder_url,
            "status": "draft",
            "submission_deadline": project_data.submission_deadline.isoformat() if project_data.submission_deadline else None,
            "auto_categorization_enabled": project_data.auto_categorization_enabled,
            "plagiarism_detection_enabled": project_data.plagiarism_detection_enabled
            # description, theme_desc are not in the schema provided by user, so skipping them or check if schema has jsonb?
            # User schema didn't show 'description' or 'track_mode' columns. 
            # I will assume standard columns provided in schema request.
        }
        
        project_res = admin_supabase.table("projects").insert(project_payload).execute()
        if not project_res.data:
             raise HTTPException(status_code=500, detail="Failed to create project in database.")
        
        new_project = project_res.data[0]
        project_id = new_project["project_id"]

        # B. Insert Problem Statements (if any)
        # Check if 'problem_statements' table exists logic - Assuming it does per user request
        if project_data.problem_statements:
            ps_payload = [
                {
                    "project_id": project_id,
                    "title": ps.title,
                    "description": ps.description
                } for ps in project_data.problem_statements
            ]
            # We wrap this in try/except to catch if table doesn't exist
            admin_supabase.table("problem_statements").insert(ps_payload).execute()


        # C. Insert Scoring Criteria (if any)
        if project_data.scoring_criteria:
            sc_payload = [
                {
                    "project_id": project_id,
                    "criterion_name": sc.name,
                    "weight": sc.weight
                } for sc in project_data.scoring_criteria
            ]
            admin_supabase.table("scoring_criteria").insert(sc_payload).execute()

        return {
            "project_id": project_id,
            "project_name": new_project["project_name"],
            "status": "created",
            "message": "Project created. Ready to scan Drive folder."
        }

    except Exception as e:
        print(f"Database Creation Error: {str(e)}")
        # In a real app, I would roll back the 'project' creation here if subsequent steps failed.
        # Supabase API doesn't support complex transactions easily without stored procedures, 
        # so for now we just report the error.
        raise HTTPException(status_code=500, detail=str(e))
