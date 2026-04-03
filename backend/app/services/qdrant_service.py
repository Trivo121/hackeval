import os
import logging
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from qdrant_client.http.exceptions import UnexpectedResponse

logger = logging.getLogger(__name__)

# Try to get Qdrant configuration from environment or fallback to in-memory/local for development
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")

# We initialize a global client instance
try:
    if QDRANT_API_KEY:
        qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=10.0)
    else:
        # Avoid local warnings if URL is somehow empty
        qdrant_client = QdrantClient(url=QDRANT_URL, timeout=10.0)
except Exception as e:
    logger.error(f"[Qdrant] Failed to initialize Qdrant client: {e}")
    qdrant_client = None

COLLECTION_NAME = "slide_intelligence"


def init_qdrant_collection():
    """
    Called on FastAPI application startup to ensure the Qdrant
    collection is created and correctly configured.
    """
    if qdrant_client is None:
        logger.warning("[Qdrant] Client is not initialized. Skipping collection init.")
        return

    try:
        if not qdrant_client.collection_exists(COLLECTION_NAME):
            logger.info(f"[Qdrant] Collection '{COLLECTION_NAME}' does not exist. Creating...")
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config={
                    "text": VectorParams(        # ✅ named vector — matches embedding_service upserts
                        size=384,               # all-MiniLM-L6-v2 dimensions
                        distance=Distance.COSINE,
                        on_disk=True            # Saves RAM
                    )
                },
                # Setup HNSW params
                hnsw_config={
                    "m": 16,
                    "ef_construct": 100
                }
            )
            logger.info(f"[Qdrant] Collection '{COLLECTION_NAME}' created successfully.")
        else:
            logger.info(f"[Qdrant] Collection '{COLLECTION_NAME}' already exists. Ready.")

    except UnexpectedResponse as e:
        logger.error(f"[Qdrant] Error communicating with Qdrant server: {e}")
    except Exception as e:
        logger.error(f"[Qdrant] Unexpected error during collection init: {e}")

