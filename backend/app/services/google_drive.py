import httpx
import os

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

async def list_files_in_folder(folder_id: str):
    """
    Lists ALL files in a public Google Drive folder using a Google API Key.
    The folder must be set to 'Anyone with the link can view'.
    """
    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_API_KEY is not set in environment variables.")
        return []

    url = "https://www.googleapis.com/drive/v3/files"
    params = {
        "q": f"'{folder_id}' in parents and trashed = false",
        "fields": "files(id, name, mimeType)",
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
            print(f"Found {len(files)} files: {[f.get('name') for f in files]}")
            return files

        except Exception as e:
            print(f"Drive Service Exception: {str(e)}")
            return []