import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

from models.schemas import (
    TextRequest,
    VoiceRequest,
    ExtractionResponse,
)
from services.language_service import (
    detect_language,
    get_language_name,
)
from services.extraction_service import (
    extract_profile,
    llm_used_for_last_extraction,
)
from services.document_service import process_document as extract_document


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["extraction"])

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".txt",
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".tif",
    ".tiff",
}


# ============================================================
# COMMON RESPONSE BUILDER
# ============================================================

def _response(
    text: str,
    method: str,
    language: str | None = None,
) -> ExtractionResponse:
    text = text.strip()

    if not text:
        raise HTTPException(
            status_code=422,
            detail="No text was provided for extraction.",
        )

    detected_language = (
        language.strip()
        if language and language.strip()
        else detect_language(text)
    )

    try:
        profile = extract_profile(text, detected_language)
        used_llm = llm_used_for_last_extraction()

        if used_llm:
            extraction_method = (
                f"{method}; LLM-assisted extraction "
                "with deterministic fallback"
            )
        else:
            extraction_method = (
                f"{method}; deterministic extraction "
                "(LLM unavailable or unsuccessful)"
            )

        return ExtractionResponse(
            success=True,
            language=detected_language,
            language_name=get_language_name(detected_language),
            profile=profile,
            raw_text=text[:10000],
            extraction_method=extraction_method,
            llm_used=used_llm,
        )

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Candidate profile extraction failed.")

        raise HTTPException(
            status_code=500,
            detail="Could not extract candidate information.",
        ) from exc


# ============================================================
# TEXT EXTRACTION
# ============================================================

@router.post(
    "/process-text",
    response_model=ExtractionResponse,
)
async def process_text(request: TextRequest):
    text = request.text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Text input is empty.",
        )

    return _response(
        text=text,
        method="Text input",
        language=request.language,
    )


# ============================================================
# VOICE TRANSCRIPT EXTRACTION
# ============================================================

@router.post(
    "/voice",
    response_model=ExtractionResponse,
)
async def process_voice(request: VoiceRequest):
    transcript = request.transcript.strip()

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Voice transcript is empty.",
        )

    return _response(
        text=transcript,
        method="Voice transcript",
        language=request.language,
    )


# ============================================================
# DOCUMENT EXTRACTION
# ============================================================

@router.post(
    "/process-document",
    response_model=ExtractionResponse,
)
async def process_uploaded_document(
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was provided.",
        )

    # Extract only the extension from the supplied filename.
    original_name = Path(file.filename).name
    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. Allowed extensions: "
                + ", ".join(sorted(ALLOWED_EXTENSIONS))
            ),
        )

    temporary_name = f"{uuid.uuid4().hex}{extension}"
    temporary_path = UPLOAD_DIR / temporary_name

    try:
        # Read in chunks and enforce a size limit.
        total_bytes = 0

        with temporary_path.open("wb") as destination:
            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                total_bytes += len(chunk)

                if total_bytes > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="File exceeds the 15 MB upload limit.",
                    )

                destination.write(chunk)

        if total_bytes == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        try:
            extracted_text, document_method = extract_document(
                str(temporary_path),
                original_name,
            )

        except HTTPException:
            raise

        except RuntimeError as exc:
            logger.warning(
                "Document processing could not complete: %s",
                exc,
            )

            raise HTTPException(
                status_code=422,
                detail=str(exc),
            ) from exc

        except Exception as exc:
            logger.exception("Document processing failed.")

            raise HTTPException(
                status_code=422,
                detail=(
                    "The document could not be processed. "
                    "Check that the file is valid and readable."
                ),
            ) from exc

        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=422,
                detail=(
                    "No text could be extracted from the document. "
                    "If it is scanned, verify that OCR is installed "
                    "and configured correctly."
                ),
            )

        return _response(
            text=extracted_text,
            method=f"Document processing ({document_method})",
        )

    finally:
        await file.close()

        # Remove the temporary upload regardless of success or failure.
        try:
            if temporary_path.exists():
                temporary_path.unlink()
        except OSError:
            logger.exception(
                "Could not remove temporary upload: %s",
                temporary_path,
            )