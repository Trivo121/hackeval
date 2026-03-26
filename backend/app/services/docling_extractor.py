"""
docling_extractor.py — Step 2: EXTRACT

Strategy:
  1. PRIMARY: PyMuPDF (fitz) — fast native text extraction, works on 99% of
     PPT-exported PDFs which have selectable text embedded. Zero ML models,
     runs in milliseconds per page.
  2. FALLBACK: EasyOCR — only triggered for pages where PyMuPDF finds no text
     at all (truly image-only pages). Runs only when needed.

What is extracted per slide/page:
  - text_content     : all text from the page
  - tables_data      : array of { "markdown": "...", "csv": "..." }
  - images_ocr_text  : OCR text from image-only pages (EasyOCR fallback)
  - element_counts   : { "text_blocks": N, "tables": N, "pictures": N }
  - complexity_score : float 0.0–1.0 based on content density
CPU-bound extraction runs in a ThreadPoolExecutor to avoid blocking FastAPI.
""" 

import asyncio
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from typing import Optional

from app.database import admin_supabase

logger = logging.getLogger(__name__)

# Keep concurrency low — OCR is memory-heavy
_EXECUTOR = ThreadPoolExecutor(max_workers=2)

# EasyOCR reader is expensive to initialize — cache it after first load
_easyocr_reader = None
_easyocr_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Public async entry point
# ---------------------------------------------------------------------------

async def extract_submission_slides(
    pdf_bytes: BytesIO,
    submission_id: str,
    project_id: str,
) -> bool:
    """
    Step 2 — Extract:
      1. Run extraction synchronously in a thread pool (CPU-bound)
      2. Collect per-page text, tables, picture OCR, layout metadata
      3. Bulk-insert into `submission_slides` table in Supabase

    Returns True on success, False on failure.
    """
    loop = asyncio.get_event_loop()
    try:
        slide_records = await loop.run_in_executor(
            _EXECUTOR,
            _sync_extract_pdf,
            pdf_bytes,
            submission_id,
            project_id,
        )
    except Exception as e:
        logger.error(
            f"[Step2/Extract] Thread executor error for submission_id={submission_id}: {e}"
        )
        return False

    if not slide_records:
        logger.warning(
            f"[Step2/Extract] No slides extracted for submission_id={submission_id}"
        )
        return False

    return await _store_slides(slide_records, submission_id)


# ---------------------------------------------------------------------------
# Sync extraction (runs in thread pool)
# ---------------------------------------------------------------------------

def _sync_extract_pdf(
    pdf_bytes: BytesIO,
    submission_id: str,
    project_id: str,
) -> list[dict]:
    """
    Main extraction. Uses PyMuPDF for all pages, falls back to EasyOCR
    only for pages that yield zero text from PyMuPDF.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        logger.error(
            "[Step2/Extract] PyMuPDF not installed. Run: pip install pymupdf"
        )
        return []

    logger.info(
        f"[Step2/Extract] Starting extraction for submission_id={submission_id}"
    )

    pdf_bytes.seek(0)
    raw = pdf_bytes.read()

    # ── Open with PyMuPDF ──
    try:
        fitz_doc = fitz.open(stream=raw, filetype="pdf")
    except Exception as e:
        logger.error(f"[Step2/Extract] PyMuPDF failed to open PDF: {e}")
        return []

    total_pages = len(fitz_doc)
    logger.info(f"[Step2/Extract] PDF has {total_pages} page(s)")

    if total_pages == 0:
        logger.error("[Step2/Extract] PDF has 0 pages")
        return []

    # ── Per-page extraction ──
    slide_records = []

    for page_idx in range(total_pages):
        page_no = page_idx + 1  # 1-indexed for display
        text_content = None
        tables_data = None
        images_ocr_text = None
        n_text = 0
        n_tables = 0
        n_pictures = 0

        try:
            page = fitz_doc[page_idx]

            # ── 1. Native text extraction (fast, no ML) ──
            raw_text = page.get_text("text").strip()

            if raw_text:
                # Clean up the text — remove excessive blank lines
                lines = [ln.strip() for ln in raw_text.splitlines()]
                lines = [ln for ln in lines if ln]  # drop empty lines
                text_content = "\n".join(lines)
                n_text = len(lines)
                logger.debug(
                    f"[Step2/Extract] Page {page_no}: PyMuPDF got {n_text} lines"
                )

            # ── 2. Table extraction via PyMuPDF ──
            try:
                tabs = page.find_tables()
                if tabs and tabs.tables:
                    n_tables = len(tabs.tables)
                    tables_data = []
                    for tbl in tabs.tables:
                        try:
                            df = tbl.to_pandas()
                            md = df.to_markdown(index=False) if df is not None else ""
                            csv = df.to_csv(index=False) if df is not None else ""
                            tables_data.append({"markdown": md, "csv": csv})
                        except Exception as te:
                            logger.debug(
                                f"[Step2/Extract] Table to_pandas error page {page_no}: {te}"
                            )
                            tables_data.append({"markdown": "", "csv": ""})
            except Exception as te:
                logger.debug(
                    f"[Step2/Extract] Table detection error page {page_no}: {te}"
                )

            # ── 3. Count images on page ──
            try:
                image_list = page.get_images(full=False)
                n_pictures = len(image_list)
            except Exception:
                n_pictures = 0

            # ── 4. EasyOCR fallback — only if page has NO native text ──
            if not text_content:
                logger.info(
                    f"[Step2/Extract] Page {page_no}: no native text found, "
                    f"attempting EasyOCR fallback..."
                )
                ocr_text = _ocr_page_easyocr(page, page_no, submission_id)
                if ocr_text:
                    images_ocr_text = ocr_text
                    n_pictures = max(n_pictures, 1)  # at least 1 image element
                    logger.info(
                        f"[Step2/Extract] Page {page_no}: EasyOCR extracted "
                        f"{len(ocr_text)} chars"
                    )
                else:
                    logger.info(
                        f"[Step2/Extract] Page {page_no}: EasyOCR also found no text"
                    )

        except Exception as e:
            logger.error(
                f"[Step2/Extract] Error processing page {page_no}: {e}"
            )

        # ── Complexity score ──
        raw_score = (n_text * 1.0 + n_tables * 3.0 + n_pictures * 2.0)
        complexity = round(min(1.0, raw_score / 25.0), 4)

        slide_records.append({
            "submission_id": submission_id,
            "project_id": project_id,
            "slide_number": page_no,
            "text_content": text_content if text_content else None,
            "tables_data": tables_data if tables_data else None,
            "images_ocr_text": images_ocr_text if images_ocr_text else None,
            "element_counts": {
                "text_blocks": n_text,
                "tables": n_tables,
                "pictures": n_pictures,
            },
            "complexity_score": complexity,
        })

    fitz_doc.close()

    non_empty = sum(
        1 for r in slide_records
        if r["text_content"] or r["images_ocr_text"]
    )
    logger.info(
        f"[Step2/Extract] Built {len(slide_records)} slide records "
        f"({non_empty} non-empty) for submission_id={submission_id}"
    )
    return slide_records


# ---------------------------------------------------------------------------
# EasyOCR fallback — only called for image-only pages
# ---------------------------------------------------------------------------

def _get_easyocr_reader():
    """Lazy-initialize EasyOCR reader (cached globally, thread-safe)."""
    global _easyocr_reader
    if _easyocr_reader is not None:
        return _easyocr_reader
    with _easyocr_lock:
        if _easyocr_reader is None:
            try:
                import easyocr
                logger.info("[Step2/Extract] Loading EasyOCR model (first time only)...")
                _easyocr_reader = easyocr.Reader(
                    ["en"],
                    gpu=False,          # CPU only — avoids CUDA memory issues
                    verbose=False,
                )
                logger.info("[Step2/Extract] EasyOCR model loaded ✅")
            except ImportError:
                logger.warning(
                    "[Step2/Extract] EasyOCR not installed. "
                    "Run: pip install easyocr  (optional, for image-only pages)"
                )
                return None
            except Exception as e:
                logger.error(f"[Step2/Extract] EasyOCR init failed: {e}")
                return None
    return _easyocr_reader


def _ocr_page_easyocr(page, page_no: int, submission_id: str) -> Optional[str]:
    """
    Render the page to a PIL image and run EasyOCR on it.
    Returns extracted text or None on failure.
    Uses a 4-minute timeout to prevent hanging.
    """
    result_holder = [None]
    error_holder = [None]

    def _run_ocr():
        try:
            import fitz
            reader = _get_easyocr_reader()
            if reader is None:
                return

            # Render page at 1.5x scale (balance quality vs memory)
            mat = fitz.Matrix(1.5, 1.5)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes("png")
            pix = None  # free memory

            import numpy as np
            from PIL import Image
            import io

            img = Image.open(io.BytesIO(img_bytes))
            img_array = np.array(img)
            img = None  # free memory

            results = reader.readtext(img_array, detail=0, paragraph=True)
            img_array = None  # free memory

            if results:
                result_holder[0] = "\n".join(
                    r.strip() for r in results if r.strip()
                )
        except Exception as e:
            error_holder[0] = e

    ocr_thread = threading.Thread(target=_run_ocr, daemon=True)
    ocr_thread.start()
    ocr_thread.join(timeout=240)  # 4 min max per page

    if ocr_thread.is_alive():
        logger.warning(
            f"[Step2/Extract] EasyOCR timed out on page {page_no} "
            f"for submission_id={submission_id} — skipping"
        )
        return None

    if error_holder[0]:
        logger.warning(
            f"[Step2/Extract] EasyOCR error on page {page_no}: {error_holder[0]}"
        )
        return None

    return result_holder[0]


# ---------------------------------------------------------------------------
# Persist to Supabase
# ---------------------------------------------------------------------------

async def _store_slides(slide_records: list[dict], submission_id: str) -> bool:
    """Bulk-inserts all slide records into `submission_slides`."""
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            _EXECUTOR,
            _sync_insert_slides,
            slide_records,
        )
        logger.info(
            f"[Step2/Extract] Stored {len(slide_records)} slides "
            f"for submission_id={submission_id} ✅"
        )
        return True
    except Exception as e:
        logger.error(
            f"[Step2/Extract] DB insert failed for submission_id={submission_id}: {e}"
        )
        return False


def _sync_insert_slides(slide_records: list[dict]) -> None:
    """Synchronous Supabase bulk insert — runs in thread pool."""
    result = (
        admin_supabase
        .table("submission_slides")
        .insert(slide_records)
        .execute()
    )
    if not result.data:
        raise RuntimeError(
            "Supabase returned no data after insert — insert may have failed."
        )