
"""
Document Processing Service
Project: AI-Powered Government Scholarship & Welfare Navigator

Phase 2 responsibilities:
- Extract text from typed PDFs.
- Run OCR on scanned PDFs and images when configured.
- Extract common applicant information.
- Identify missing or unreadable information.
- Compare available documents with a scheme's recorded document list.
- Return structured results for the frontend.

Optional dependencies:
    PyMuPDF
    Pillow
    pytesseract

OCR additionally requires the Tesseract OCR executable to be installed.
"""

from __future__ import annotations

import io
import logging
import os
import re
from pathlib import Path
from typing import Any, Optional


logger = logging.getLogger(__name__)

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

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
MAX_PDF_PAGES = 50
MIN_TEXT_LENGTH = 20

# These are extraction labels, not proof that the values are genuine.
FIELD_PATTERNS: dict[str, list[str]] = {
    "name": [
        r"(?:applicant|candidate|student)\s+name\s*[:\-]\s*([^\n\r]+)",
        r"(?:name\s+of\s+(?:the\s+)?(?:applicant|candidate|student))\s*[:\-]\s*([^\n\r]+)",
    ],
    "date_of_birth": [
        r"(?:date\s+of\s+birth|dob|birth\s+date)\s*[:\-]\s*"
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})",
    ],
    "annual_family_income": [
        r"(?:annual\s+family\s+income|annual\s+income|family\s+income)"
        r"\s*[:\-]\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)",
    ],
    "category": [
        r"(?:social\s+category|community|caste\s+category|category)"
        r"\s*[:\-]\s*([^\n\r]+)",
    ],
    "state": [
        r"(?:state|domicile\s+state|state\s+of\s+domicile)"
        r"\s*[:\-]\s*([^\n\r]+)",
    ],
    "education_level": [
        r"(?:education\s+level|qualification|current\s+course|course)"
        r"\s*[:\-]\s*([^\n\r]+)",
    ],
    "disability_percentage": [
        r"(?:disability\s+percentage|percentage\s+of\s+disability)"
        r"\s*[:\-]\s*(\d{1,3}(?:\.\d{1,2})?)\s*%?",
    ],
    "certificate_number": [
        r"(?:certificate\s+(?:no\.?|number|id)|certificate\s+reference)"
        r"\s*[:\-]\s*([A-Z0-9/-]+)",
    ],
}


# ---------------------------------------------------------------------
# Optional dependency loading
# ---------------------------------------------------------------------

def _load_fitz():
    try:
        import fitz
        return fitz
    except ImportError:
        return None


def _load_pillow():
    try:
        from PIL import Image
        return Image
    except ImportError:
        return None


def _load_pytesseract():
    try:
        import pytesseract
        return pytesseract
    except ImportError:
        return None


# ---------------------------------------------------------------------
# General helpers
# ---------------------------------------------------------------------

def _normalise_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _decode_text(data: bytes) -> str:
    """Fallback decoder for plain text files if needed."""
    for encoding in ("utf-8", "utf-8-sig", "cp1252"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue

    return data.decode("utf-8", errors="replace")


def _get_extension(filename: Optional[str]) -> str:
    return Path(filename or "").suffix.lower()


def _check_file_size(data: bytes) -> None:
    if not data:
        raise ValueError("The uploaded document is empty.")

    if len(data) > MAX_FILE_SIZE_BYTES:
        raise ValueError(
            "The uploaded document exceeds the 20 MB processing limit."
        )


def _ocr_available() -> tuple[bool, str]:
    pytesseract = _load_pytesseract()

    if pytesseract is None:
        return False, "The pytesseract Python package is not installed."

    try:
        pytesseract.get_tesseract_version()
        return True, ""
    except Exception:
        return (
            False,
            "Tesseract OCR is not installed or its executable is not configured.",
        )


# ---------------------------------------------------------------------
# Typed PDF extraction
# ---------------------------------------------------------------------

def extract_text_from_pdf(
    file_bytes: bytes,
    *,
    max_pages: int = MAX_PDF_PAGES,
) -> dict[str, Any]:
    """
    Extract selectable text from a PDF.

    Scanned pages may contain no selectable text. OCR is attempted for
    those pages when Tesseract and Pillow are available.
    """
    _check_file_size(file_bytes)

    fitz = _load_fitz()

    if fitz is None:
        return {
            "success": False,
            "text": "",
            "page_count": 0,
            "extraction_method": "none",
            "ocr_used": False,
            "warnings": ["PyMuPDF is not installed; PDF text extraction is unavailable."],
            "error": "Missing dependency: PyMuPDF.",
        }

    warnings: list[str] = []
    page_texts: list[str] = []
    ocr_used = False

    try:
        with fitz.open(stream=file_bytes, filetype="pdf") as document:
            if document.is_encrypted:
                return {
                    "success": False,
                    "text": "",
                    "page_count": len(document),
                    "extraction_method": "none",
                    "ocr_used": False,
                    "warnings": [],
                    "error": "The PDF is password-protected.",
                }

            page_count = len(document)
            pages_to_process = min(page_count, max_pages)

            if page_count > max_pages:
                warnings.append(
                    f"The PDF has {page_count} pages; only the first "
                    f"{max_pages} pages were processed."
                )

            ocr_status, ocr_message = _ocr_available()
            pytesseract = _load_pytesseract() if ocr_status else None
            Image = _load_pillow() if ocr_status else None

            for page_index in range(pages_to_process):
                page = document.load_page(page_index)
                text = _normalise_text(page.get_text("text") or "")

                # A short or empty extraction may indicate a scanned page.
                if len(text) < MIN_TEXT_LENGTH:
                    if pytesseract is not None and Image is not None:
                        try:
                            pixmap = page.get_pixmap(
                                matrix=fitz.Matrix(2, 2),
                                alpha=False,
                            )
                            image_bytes = pixmap.tobytes("png")

                            with Image.open(io.BytesIO(image_bytes)) as image:
                                ocr_text = pytesseract.image_to_string(
                                    image.convert("RGB")
                                )

                            ocr_text = _normalise_text(ocr_text)

                            if len(ocr_text) > len(text):
                                text = ocr_text
                                ocr_used = True

                        except Exception:
                            logger.exception(
                                "OCR failed for PDF page %s",
                                page_index + 1,
                            )
                            warnings.append(
                                f"OCR could not process page {page_index + 1}."
                            )

                    elif ocr_message:
                        warnings.append(
                            f"Page {page_index + 1} may be scanned. {ocr_message}"
                        )

                page_texts.append(
                    f"[Page {page_index + 1}]\n{text}" if text else
                    f"[Page {page_index + 1}]\n[No readable text extracted]"
                )

        full_text = _normalise_text("\n\n".join(page_texts))

        if not full_text or all(
            "[No readable text extracted]" in item
            for item in page_texts
        ):
            warnings.append(
                "No readable text was extracted. Check image quality, "
                "PDF protection, and OCR installation."
            )

        return {
            "success": bool(full_text),
            "text": full_text,
            "page_count": page_count,
            "processed_pages": pages_to_process,
            "extraction_method": (
                "pdf_text_and_ocr"
                if ocr_used
                else "pdf_text"
            ),
            "ocr_used": ocr_used,
            "warnings": list(dict.fromkeys(warnings)),
            "error": None if full_text else "No readable text was extracted.",
        }

    except Exception as exc:
        logger.exception("PDF extraction failed")
        return {
            "success": False,
            "text": "",
            "page_count": 0,
            "extraction_method": "none",
            "ocr_used": False,
            "warnings": warnings,
            "error": f"PDF processing failed: {exc}",
        }


# ---------------------------------------------------------------------
# Image OCR
# ---------------------------------------------------------------------

def extract_text_from_image(
    file_bytes: bytes,
    *,
    language: str = "eng",
) -> dict[str, Any]:
    """
    Extract text from an image using Tesseract OCR.

    Tesseract language data must be installed for the requested language.
    Example language codes include eng, hin, tam, tel, kan, and mal.
    """
    _check_file_size(file_bytes)

    Image = _load_pillow()
    pytesseract = _load_pytesseract()

    if Image is None:
        return {
            "success": False,
            "text": "",
            "extraction_method": "none",
            "ocr_used": False,
            "warnings": ["Pillow is not installed."],
            "error": "Missing dependency: Pillow.",
        }

    if pytesseract is None:
        return {
            "success": False,
            "text": "",
            "extraction_method": "none",
            "ocr_used": False,
            "warnings": ["The pytesseract Python package is not installed."],
            "error": "Missing dependency: pytesseract.",
        }

    try:
        with Image.open(io.BytesIO(file_bytes)) as image:
            image.load()
            rgb_image = image.convert("RGB")

        text = pytesseract.image_to_string(
            rgb_image,
            lang=language,
        )
        text = _normalise_text(text)

        warnings = []

        if not text:
            warnings.append(
                "No readable text was detected. Improve the image quality "
                "or verify that the required OCR language data is installed."
            )

        return {
            "success": bool(text),
            "text": text,
            "extraction_method": "image_ocr",
            "ocr_used": True,
            "ocr_language": language,
            "warnings": warnings,
            "error": None if text else "OCR did not detect readable text.",
        }

    except Exception as exc:
        logger.exception("Image OCR failed")
        return {
            "success": False,
            "text": "",
            "extraction_method": "image_ocr",
            "ocr_used": True,
            "ocr_language": language,
            "warnings": [],
            "error": (
                "Image OCR failed. Verify the image and the installed "
                f"Tesseract language data. Details: {exc}"
            ),
        }


# ---------------------------------------------------------------------
# Main document extraction API
# ---------------------------------------------------------------------

def extract_document(
    file_bytes: bytes,
    filename: str,
    *,
    ocr_language: str = "eng",
) -> dict[str, Any]:
    """
    Extract text from a PDF or supported image.

    This function accepts raw file bytes and the original filename.
    """
    extension = _get_extension(filename)

    try:
        _check_file_size(file_bytes)
    except ValueError as exc:
        return {
            "success": False,
            "filename": filename,
            "text": "",
            "extraction_method": "none",
            "ocr_used": False,
            "warnings": [],
            "error": str(exc),
        }

    if extension == ".pdf":
        result = extract_text_from_pdf(file_bytes)

    elif extension in {
        ".png",
        ".jpg",
        ".jpeg",
        ".tif",
        ".tiff",
        ".bmp",
        ".webp",
    }:
        result = extract_text_from_image(
            file_bytes,
            language=ocr_language,
        )

    else:
        result = {
            "success": False,
            "text": "",
            "extraction_method": "none",
            "ocr_used": False,
            "warnings": [],
            "error": (
                f"Unsupported file type '{extension}'. "
                f"Supported types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
            ),
        }

    return {
        **result,
        "filename": filename,
    }


# ---------------------------------------------------------------------
# Information extraction
# ---------------------------------------------------------------------

def extract_applicant_information(text: str) -> dict[str, Any]:
    """
    Extract common labelled fields from document text.

    Results are unverified candidates for profile population. They must
    not automatically overwrite user-provided profile values.
    """
    text = _normalise_text(text)
    extracted: dict[str, Any] = {}
    field_evidence: dict[str, str] = {}
    missing_fields: list[str] = []

    for field, patterns in FIELD_PATTERNS.items():
        match_value = None

        for pattern in patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE)

            if match:
                candidate = match.group(1).strip()
                candidate = re.sub(r"\s+", " ", candidate).strip(" :;-")

                if candidate:
                    match_value = candidate
                    break

        if match_value is not None:
            extracted[field] = match_value
            field_evidence[field] = "Extracted using a text pattern; not verified."
        else:
            missing_fields.append(field)

    return {
        "extracted_information": extracted,
        "field_evidence": field_evidence,
        "missing_fields": missing_fields,
        "verification_required": True,
        "message": (
            "Extracted values are suggestions only. Review each value "
            "against the original document before using it."
        ),
    }


# ---------------------------------------------------------------------
# Missing document detection
# ---------------------------------------------------------------------

def _document_list(value: Any) -> list[str]:
    if value is None:
        return []

    if isinstance(value, (list, tuple, set)):
        raw_items = list(value)
    else:
        text = str(value).strip()

        if not text or text.lower() in {
            "none",
            "not specified",
            "unknown",
            "n/a",
        }:
            return []

        raw_items = re.split(r"[,;|\n]", text)

    return [
        str(item).strip()
        for item in raw_items
        if str(item).strip()
    ]


def _normalise_document_name(name: str) -> str:
    name = _normalise(name)
    name = re.sub(r"[_\-]+", " ", name)
    name = re.sub(r"\s+", " ", name)
    return name.strip()


def detect_missing_documents(
    required_documents: Any,
    uploaded_documents: Any,
) -> dict[str, Any]:
    """
    Compare recorded required documents with the user's uploaded
    document names.

    This checks names only. It does not verify document authenticity,
    validity, ownership, or whether the content satisfies official rules.
    """
    required = _document_list(required_documents)
    uploaded = _document_list(uploaded_documents)

    uploaded_normalised = {
        _normalise_document_name(item)
        for item in uploaded
    }

    found: list[str] = []
    missing: list[str] = []

    for required_item in required:
        required_normalised = _normalise_document_name(required_item)

        if required_normalised in uploaded_normalised:
            found.append(required_item)
            continue

        # Allow a cautious substring match for filename prefixes, such as
        # "income_certificate.pdf" matching "Income Certificate".
        matched = any(
            required_normalised == uploaded_name
            or (
                len(required_normalised) >= 5
                and required_normalised in uploaded_name
            )
            or (
                len(uploaded_name) >= 5
                and uploaded_name in required_normalised
            )
            for uploaded_name in uploaded_normalised
        )

        if matched:
            found.append(required_item)
        else:
            missing.append(required_item)

    return {
        "required_documents": required,
        "uploaded_documents": uploaded,
        "found_documents": found,
        "missing_documents": missing,
        "all_required_names_present": len(missing) == 0,
        "verification_required": True,
        "message": (
            "Document names were compared. File contents and authenticity "
            "have not been verified."
        ),
    }


# ---------------------------------------------------------------------
# Combined processing workflow
# ---------------------------------------------------------------------

def process_document(
    file_bytes: bytes,
    filename: str,
    *,
    ocr_language: str = "eng",
    required_documents: Any = None,
    uploaded_documents: Any = None,
) -> dict[str, Any]:
    """
    Full Phase 2 workflow:
      1. Extract text.
      2. Extract candidate applicant information.
      3. Optionally detect missing required document names.
    """
    extraction = extract_document(
        file_bytes,
        filename,
        ocr_language=ocr_language,
    )

    if not extraction.get("success"):
        return {
            "success": False,
            "filename": filename,
            "extraction": extraction,
            "extracted_information": {},
            "field_evidence": {},
            "missing_fields": list(FIELD_PATTERNS.keys()),
            "document_check": None,
            "verification_required": True,
            "message": extraction.get(
                "error",
                "The document could not be processed.",
            ),
        }

    text = extraction.get("text", "")
    information_result = extract_applicant_information(text)

    document_check = None

    if required_documents is not None:
        document_check = detect_missing_documents(
            required_documents,
            uploaded_documents or [filename],
        )

    return {
        "success": True,
        "filename": filename,
        "extraction": extraction,
        "extracted_text": text,
        "extracted_information": information_result[
            "extracted_information"
        ],
        "field_evidence": information_result["field_evidence"],
        "missing_fields": information_result["missing_fields"],
        "document_check": document_check,
        "verification_required": True,
        "message": (
            "Document processing completed. Review extracted information "
            "and verify it against the original document."
        ),
    }


# ---------------------------------------------------------------------
# Compatibility aliases
# ---------------------------------------------------------------------

def extract_text_from_document(
    file_bytes: bytes,
    filename: str,
    **kwargs: Any,
) -> dict[str, Any]:
    """Compatibility alias for callers using this function name."""
    return extract_document(
        file_bytes,
        filename,
        **kwargs,
    )


def analyze_document(
    file_bytes: bytes,
    filename: str,
    **kwargs: Any,
) -> dict[str, Any]:
    """Compatibility alias for document analysis callers."""
    return process_document(
        file_bytes,
        filename,
        **kwargs,
    )


def find_missing_documents(
    required_documents: Any,
    uploaded_documents: Any,
) -> dict[str, Any]:
    """Compatibility alias for missing-document detection."""
    return detect_missing_documents(
        required_documents,
        uploaded_documents,
    )
