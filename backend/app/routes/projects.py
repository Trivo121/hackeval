from fastapi import APIRouter, Depends
from app.services.auth import get_current_user
from app.services.google_drive import list_pdfs_in_folder

router = APIRouter()

@router.get("/projects/scan-drive/{folder_id}")
async def scan_folder(folder_id: str, current_user = Depends(get_current_user)):
    # 1. Use the service to get the files
    pdfs = await list_pdfs_in_folder(current_user.id, folder_id)
    
    # 2. Return to frontend
    return {"total_files": len(pdfs), "files": pdfs}