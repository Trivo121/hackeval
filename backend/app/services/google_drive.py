import httpx
import os
import re
from io import BytesIO
from datetime import datetime, timezone

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

def _parse_team_name(filename: str) -> str:
    """Extract a team name from a PDF filename. e.g. 'TeamAlpha_submission.pdf' → 'TeamAlpha'"""
    name = re.sub(r'\.pdf$', '', filename, flags=re.IGNORECASE)
    name = re.sub(r'[_\-]+', ' ', name).strip()
    return name or filename

async def list_files_in_folder(folder_id: str):
    """
    Lists ALL PDF files in a public Google Drive folder using a Google API Key.
    The folder must be set to 'Anyone with the link can view'.
    """
    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_API_KEY is not set in environment variables.")
        return []

    url = "https://www.googleapis.com/drive/v3/files"
    params = {
        "q": f"'{folder_id}' in parents and trashed = false and mimeType = 'application/pdf'",
        "fields": "files(id, name, mimeType, size)",
        "pageSize": 1000,
        "key": GOOGLE_API_KEY
    }

    async with httpx.AsyncClient() as client:
        try:
            print(f"Scanning Drive Folder: {folder_id}")
            response = await client.get(url, params=params)

            print(f"Drive API Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Drive API Error: {response.text}")
                return []

            data = response.json()
            files = data.get("files", [])
            print(f"Found {len(files)} PDF files: {[f.get('name') for f in files]}")
            return files

        except Exception as e:
            print(f"Drive Service Exception: {str(e)}")
            return []


async def scan_and_store_submissions(project_id: str, folder_id: str, drive_folder_url: str) -> dict:
    """
    Scans a Google Drive folder for PDFs, parses team names from filenames,
    and upserts each PDF as a 'pending' submission in the database.

    Returns: { "stored": N, "skipped": N, "total_found": N }
    """
    from app.database import admin_supabase

    files = await list_files_in_folder(folder_id)
    if not files:
        return {"stored": 0, "skipped": 0, "total_found": 0}

    now_iso = datetime.now(timezone.utc).isoformat()
    stored, skipped = 0, 0

    for f in files:
        file_id   = f.get("id", "")
        file_name = f.get("name", "unknown.pdf")
        file_size = int(f.get("size", 0)) if f.get("size") else None
        team_name = _parse_team_name(file_name)
        file_url  = f"https://drive.google.com/file/d/{file_id}/view"

        payload = {
            "project_id":        project_id,
            "team_name":         team_name,
            "drive_file_id":     file_id,
            "drive_file_name":   file_name,
            "drive_file_url":    file_url,
            "file_size_bytes":   file_size,
            "processing_status": "pending",
            "created_at":        now_iso,
            "updated_at":        now_iso,
        }

        try:
            admin_supabase.table("submissions").upsert(
                payload, on_conflict="drive_file_id"
            ).execute()
            stored += 1
            print(f"[Scan] Stored: {file_name} → team='{team_name}'")
        except Exception as e:
            skipped += 1
            print(f"[Scan] Skipped {file_name}: {e}")

    print(f"[Scan] Done. stored={stored}, skipped={skipped}, total={len(files)}")
    return {"stored": stored, "skipped": skipped, "total_found": len(files)}

async def stream_pdf_bytes(file_id: str) -> BytesIO | None:
    """
    Streams the raw bytes of a file from Google Drive into an in-memory BytesIO buffer.
    The file must be publicly accessible (Anyone with the link can view).
    
    Returns a BytesIO object on success, None on failure.
    """
    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_API_KEY is not set. Cannot stream PDF.")
        return None

    # Drive API media download endpoint
    url = f"https://www.googleapis.com/drive/v3/files/{file_id}"
    params = {
        "alt": "media",
        "key": GOOGLE_API_KEY
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            print(f"[Fetch] Streaming PDF bytes for file_id={file_id}")
            response = await client.get(url, params=params, follow_redirects=True)

            if response.status_code != 200:
                print(f"[Fetch] Drive media download failed: HTTP {response.status_code} — {response.text[:200]}")
                return None

            pdf_bytes = BytesIO(response.content)
            pdf_bytes.seek(0)  # Rewind to start so readers can consume from the beginning
            print(f"[Fetch] Successfully streamed {len(response.content):,} bytes for file_id={file_id}")
            return pdf_bytes

    except httpx.TimeoutException:
        print(f"[Fetch] Timeout while streaming file_id={file_id}")
        return None
    except Exception as e:
        print(f"[Fetch] Exception while streaming file_id={file_id}: {str(e)}")
        return None