"""
docling_extractor.py — Step 2: EXTRACT

Uses Docling to parse a PDF BytesIO object and stores per-slide (per-page) data
into the `submission_slides` Supabase table.

What is extracted per slide/page:
  - text_content     : all paragraphs and bullet points
  - tables_data      : array of { "markdown": "...", "csv": "..." }
  - images_ocr_text  : OCR text from PictureItems on this page
  - element_counts   : { "text_blocks": N, "tables": N, "pictures": N }
  - complexity_score : float 0.0–1.0 based on content density

Docling is CPU-bound / synchronous, so extraction runs in a ThreadPoolExecutor
to avoid blocking FastAPI's async event loop.
"""

import asyncio
import io
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from io import BytesIO
from typing import Optional

from app.database import admin_supabase

logger = logging.getLogger(__name__)

# One shared thread pool — Docling models are heavy, keep concurrency low
_EXECUTOR = ThreadPoolExecutor(max_workers=2)


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
      1. Run Docling synchronously in a thread pool (CPU-bound)
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
        logger.error(f"[Step2/Extract] Thread executor error for submission_id={submission_id}: {e}")
        return False

    if not slide_records:
        logger.warning(f"[Step2/Extract] No slides extracted for submission_id={submission_id}")
        return False

    # Persist all slides in one DB call
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
    Synchronous Docling extraction. Returns a list of slide record dicts
    ready for insertion into submission_slides.
    """
    # Import here so the heavy Docling models only load inside the thread,
    # not at module import time (keeps startup fast).
    from docling.document_converter import DocumentConverter, PdfFormatOption
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.datamodel.document import DocumentStream
    from docling_core.types.doc import TextItem, TableItem, PictureItem

    logger.info(f"[Step2/Extract] Starting Docling parse for submission_id={submission_id}")

    # ── Configure Docling pipeline ──
    pipeline_opts = PdfPipelineOptions()
    pipeline_opts.do_ocr = True                  # OCR for image-embedded text
    pipeline_opts.generate_picture_images = False  # Skip saving PNG files (memory only)
    pipeline_opts.generate_page_images = False

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_opts)
        }
    )

    # ── Feed BytesIO via DocumentStream ──
    pdf_bytes.seek(0)
    stream = DocumentStream(name=f"{submission_id}.pdf", stream=pdf_bytes)

    try:
        conv_res = converter.convert(stream)
    except Exception as e:
        logger.error(f"[Step2/Extract] Docling conversion failed: {e}")
        return []

    doc = conv_res.document
    total_pages = len(doc.pages)
    logger.info(f"[Step2/Extract] Docling parsed {total_pages} page(s)")

    # ── Build per-page buckets ──
    # page_no in Docling is 1-indexed
    page_text: dict[int, list[str]] = {p: [] for p in range(1, total_pages + 1)}
    page_tables: dict[int, list[dict]] = {p: [] for p in range(1, total_pages + 1)}
    page_ocr: dict[int, list[str]] = {p: [] for p in range(1, total_pages + 1)}

    for element, _level in doc.iterate_items():
        # Safely get the page number from provenance
        page_no = _get_page_no(element)
        if page_no is None or page_no not in page_text:
            continue

        if isinstance(element, TableItem):
            # Export table as markdown + CSV
            try:
                df = element.export_to_dataframe(doc=doc)
                md = df.to_markdown(index=False) if df is not None else ""
                csv = df.to_csv(index=False) if df is not None else ""
                page_tables[page_no].append({"markdown": md, "csv": csv})
            except Exception as e:
                logger.warning(f"[Step2/Extract] Table export error on page {page_no}: {e}")
                page_tables[page_no].append({"markdown": "", "csv": ""})

        elif isinstance(element, PictureItem):
            # Docling with do_ocr=True may annotate pictures with OCR text
            # Check for annotations / captions
            try:
                if hasattr(element, "captions") and element.captions:
                    for cap in element.captions:
                        if hasattr(cap, "text") and cap.text:
                            page_ocr[page_no].append(cap.text.strip())
                # Also check for text annotations
                if hasattr(element, "annotations"):
                    for ann in element.annotations:
                        if hasattr(ann, "text") and ann.text:
                            page_ocr[page_no].append(ann.text.strip())
            except Exception:
                pass  # silently skip failed OCR

        elif isinstance(element, TextItem):
            # Any text block: paragraph, heading, list item, etc.
            try:
                text = element.text.strip() if element.text else ""
                if text:
                    page_text[page_no].append(text)
            except Exception:
                pass

    # ── Assemble slide records ──
    slide_records = []
    for page_no in range(1, total_pages + 1):
        texts = page_text[page_no]
        tables = page_tables[page_no]
        ocr_chunks = page_ocr[page_no]

        n_text = len(texts)
        n_tables = len(tables)
        n_pictures = len(ocr_chunks)

        # Complexity: weighted element count, capped at 1.0
        raw_score = (n_text * 1.0 + n_tables * 3.0 + n_pictures * 2.0)
        complexity = round(min(1.0, raw_score / 25.0), 4)

        slide_records.append({
            "submission_id": submission_id,
            "project_id": project_id,
            "slide_number": page_no,
            "text_content": "\n\n".join(texts) if texts else None,
            "tables_data": tables if tables else None,       # jsonb list
            "images_ocr_text": "\n\n".join(ocr_chunks) if ocr_chunks else None,
            "element_counts": {
                "text_blocks": n_text,
                "tables": n_tables,
                "pictures": n_pictures,
            },
            "complexity_score": complexity,
        })

    logger.info(
        f"[Step2/Extract] Built {len(slide_records)} slide records "
        f"for submission_id={submission_id}"
    )
    return slide_records


# ---------------------------------------------------------------------------
# Persist to Supabase
# ---------------------------------------------------------------------------

async def _store_slides(slide_records: list[dict], submission_id: str) -> bool:
    """
    Bulk-inserts all slide records into `submission_slides`.
    Returns True on success, False on failure.
    """
    try:
        # Supabase Python client is synchronous — run it in executor too
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
    # Supabase JSONB columns need serializable data — ensure it
    for record in slide_records:
        if record.get("tables_data") is not None:
            # Tables data is already a list of dicts — fine for Supabase
            pass
        if record.get("element_counts") is not None:
            # Already a dict — fine
            pass

    result = (
        admin_supabase
        .table("submission_slides")
        .insert(slide_records)
        .execute()
    )
    if not result.data:
        raise RuntimeError("Supabase returned no data after insert — insert may have failed.")


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get_page_no(element) -> Optional[int]:
    """Safely extract page_no from a Docling element's provenance."""
    try:
        if hasattr(element, "prov") and element.prov:
            return element.prov[0].page_no
    except Exception:
        pass
    return None
