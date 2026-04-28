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
    if qdrant_client is None:
        logger.warning("[Qdrant] Client is not initialized. Skipping collection init.")
        return

    try:
        needs_create = True

        if qdrant_client.collection_exists(COLLECTION_NAME):
            info = qdrant_client.get_collection(COLLECTION_NAME)
            vectors_cfg = info.config.params.vectors

            if isinstance(vectors_cfg, dict) and "text" in vectors_cfg:
                logger.info(f"[Qdrant] Collection '{COLLECTION_NAME}' exists with correct schema.")
                needs_create = False
            else:
                logger.warning("[Qdrant] Wrong vector schema. Deleting and recreating...")
                qdrant_client.delete_collection(COLLECTION_NAME)

        if needs_create:
            logger.info(f"[Qdrant] Creating collection '{COLLECTION_NAME}'...")
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config={
                    "text": VectorParams(
                        size=384,
                        distance=Distance.COSINE,
                        on_disk=True
                    )
                }
            )
            logger.info(f"[Qdrant] Collection '{COLLECTION_NAME}' created successfully.")

        # ✅ CREATE PAYLOAD INDEXES — required by Qdrant Cloud for filtered scroll/search
        from qdrant_client.http.models import PayloadSchemaType
        indexes_to_create = ["granularity", "project_id", "submission_id", "statement_id"]
        for field in indexes_to_create:
            try:
                qdrant_client.create_payload_index(
                    collection_name=COLLECTION_NAME,
                    field_name=field,
                    field_schema=PayloadSchemaType.KEYWORD,
                )
                logger.info(f"[Qdrant] Payload index created for '{field}'")
            except Exception as idx_e:
                # Index already exists — safe to ignore
                logger.debug(f"[Qdrant] Index for '{field}' skipped: {idx_e}")

    except UnexpectedResponse as e:
        logger.error(f"[Qdrant] Error communicating with Qdrant server: {e}")
    except Exception as e:
        logger.error(f"[Qdrant] Unexpected error during collection init: {e}")