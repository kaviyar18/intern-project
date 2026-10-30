
"""
Document Processing Router
Project: AI-Powered Government Scholarship & Welfare Navigator

Endpoints:
    POST /api/documents/upload
    POST /api/documents/extract
    POST /api/documents/analyze
    POST /api/documents/missing

The router passes uploaded file bytes to document_service.py.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field

try:
    from services.document_service import (
        detect_missing_documents,
        extract_applicant_information,
        extract_document,
        process_document,
    )
except ImportError:
    from backend.services.document_service import (
        detect_missing_documents,
        extract_applicant_information,
        extract_document,
        process_document,
    )


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/documents",
    tags=["Document Processing"],
)

MAX_UPLOAD_BYTES = 20 * 1024 * 1024

SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".tif",
    ".tiff",
    ".bmp",
    ".webp",
}


# ---------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------

class MissingDocumentsRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    required_documents: list[str] = Field(default_factory=list)
    uploaded_documents: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def _extension(filename: Optional[str]) -> str:
    if not filename:
        return ""
    filename = filename.replace("\\", "/")
    return "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _parse_document_list(value: Optional[str]) -> list[str]:
    """
    Accept comma-separated document names from multipart form fields.
    """
    if not value:
        return []

    import json

    try:
        decoded = json.loads(value)
        if isinstance(decoded, list):
            return [
                str(item).strip()
                for item in decoded
                if str(item).strip()
            ]
    except (json.JSONDecodeError, TypeError):
        pass

    return [
        item.strip()
        for item in value.replace("|", ",").replace(";", ",").split(",")
        if item.strip()
    ]


async def _read_upload(file: UploadFile) -> tuple[bytes, str]:
    filename = file.filename or "uploaded_document"
    extension = _extension(filename)

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{extension or 'unknown'}'. "
                f"Supported types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
            ),
        )

    content = await file.read(MAX_UPLOAD_BYTES + 1)

    if not content:
        raise HTTPException(
            status_code=422,
            detail="The uploaded file is empty.",
        )

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="The file exceeds the 20 MB upload limit.",
        )

    return content, filename


def _error_response(message: str) -> dict[str, Any]:
    return {
        "success": False,
        "message": message,
        "extracted_text": "",
        "extracted_information": {},
        "missing_fields": [],
        "document_check": None,
        "verification_required": True,
    }


# ---------------------------------------------------------------------
# POST /api/documents/upload
# ---------------------------------------------------------------------

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    ocr_language: str = Form(default="eng"),
    required_documents: Optional[str] = Form(default=None),
    uploaded_documents: Optional[str] = Form(default=None),
):
    """
    Upload a PDF or image and extract its contents.

    Multipart form fields:
        file: uploaded PDF/image
        ocr_language: Tesseract language code, e.g. eng, hin, tam
        required_documents: optional JSON array or comma-separated names
        uploaded_documents: optional JSON array or comma-separated names
    """
    content, filename = await _read_upload(file)

    required = _parse_document_list(required_documents)
    uploaded = _parse_document_list(uploaded_documents)

    if not uploaded:
        uploaded = [filename]

    try:
        result = process_document(
            content,
            filename,
            ocr_language=ocr_language,
            required_documents=required if required else None,
            uploaded_documents=uploaded,
        )

        return {
            **result,
            "success": bool(result.get("success")),
            "message": result.get(
                "message",
                "Document processing completed.",
            ),
        }

    except Exception as exc:
        logger.exception("Document upload processing failed")
        raise HTTPException(
            status_code=500,
            detail="Document processing failed. Check the backend logs.",
        ) from exc

    finally:
        await file.close()


# ---------------------------------------------------------------------
# POST /api/documents/extract
# ---------------------------------------------------------------------

@router.post("/extract")
async def extract_document_text(
    file: UploadFile = File(...),
    ocr_language: str = Form(default="eng"),
):
    """Extract text without running the applicant-information extractor."""
    content, filename = await _read_upload(file)

    try:
        result = extract_document(
            content,
            filename,
            ocr_language=ocr_language,
        )

        return {
            **result,
            "success": bool(result.get("success")),
            "extracted_text": result.get("text", ""),
        }

    except Exception as exc:
        logger.exception("Document text extraction failed")
        raise HTTPException(
            status_code=500,
            detail="Could not extract document text.",
        ) from exc

    finally:
        await file.close()


# ---------------------------------------------------------------------
# POST /api/documents/analyze
# ---------------------------------------------------------------------

@router.post("/analyze")
async def analyze_uploaded_document(
    file: UploadFile = File(...),
    ocr_language: str = Form(default="eng"),
):
    """Extract text and identify common applicant fields."""
    content, filename = await _read_upload(file)

    try:
        result = process_document(
            content,
            filename,
            ocr_language=ocr_language,
        )

        return {
            **result,
            "success": bool(result.get("success")),
            "analysis": result.get("extracted_information", {}),
            "message": result.get(
                "message",
                "Document analysis completed.",
            ),
        }

    except Exception as exc:
        logger.exception("Document analysis failed")
        raise HTTPException(
            status_code=500,
            detail="Could not analyze the document.",
        ) from exc

    finally:
        await file.close()


# ---------------------------------------------------------------------
# POST /api/documents/missing
# ---------------------------------------------------------------------

@router.post("/missing")
async def check_missing_documents(
    payload: MissingDocumentsRequest,
):
    """
    Compare uploaded document names with required document names.

    This is a name-based check, not a validation of document authenticity.
    """
    try:
        result = detect_missing_documents(
            payload.required_documents,
            payload.uploaded_documents,
        )

        return {
            "success": True,
            **result,
        }

    except Exception as exc:
        logger.exception("Missing document check failed")
        raise HTTPException(
            status_code=500,
            detail="Could not check missing documents.",
        ) from exc
