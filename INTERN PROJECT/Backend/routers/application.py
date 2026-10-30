
"""
Scholarship Applications Router
Project: AI-Powered Government Scholarship & Welfare Navigator

Endpoints:
    POST /api/applications
    GET  /api/applications
    GET  /api/applications/{application_id}
    PATCH /api/applications/{application_id}

Development note:
Application records are stored in memory. They will be lost when the
backend restarts. Persistent storage can be added later.
"""

from __future__ import annotations

import logging
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from threading import RLock
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

try:
    from services.scheme_service import get_scheme_by_id
    from services.eligibility_service import evaluate_scheme
except ImportError:
    from backend.services.scheme_service import get_scheme_by_id
    from backend.services.eligibility_service import evaluate_scheme


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"],
)


# ---------------------------------------------------------------------
# In-memory development storage
# ---------------------------------------------------------------------

_application_lock = RLock()
_applications: dict[str, dict[str, Any]] = {}

VALID_STATUSES = {
    "draft",
    "submitted",
    "under review",
    "approved",
    "rejected",
    "additional information required",
    "withdrawn",
}


# ---------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------

class ApplicationRequest(BaseModel):
    """Accept nested or flat application data from the frontend."""

    model_config = ConfigDict(extra="allow")

    scheme_id: Optional[str] = None
    scheme_name: Optional[str] = None
    profile: dict[str, Any] = Field(default_factory=dict)
    applicant_name: Optional[str] = None
    application_data: dict[str, Any] = Field(default_factory=dict)
    documents: list[Any] = Field(default_factory=list)
    status: Optional[str] = "draft"


class ApplicationStatusUpdate(BaseModel):
    """Request model for updating an application's status."""

    model_config = ConfigDict(extra="allow")

    status: str
    remarks: Optional[str] = None


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def _to_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return deepcopy(value)

    if hasattr(value, "model_dump"):
        return value.model_dump(exclude_none=True)

    if hasattr(value, "dict"):
        return value.dict(exclude_none=True)

    return {}


def _first(data: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = data.get(key)
        if value is not None and str(value).strip():
            return value
    return None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_status(status: Any) -> str:
    value = str(status or "draft").strip().lower()
    value = value.replace("_", " ").replace("-", " ")

    if value not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid application status '{status}'. "
                f"Allowed statuses: {', '.join(sorted(VALID_STATUSES))}."
            ),
        )

    return value


def _get_scheme_id(data: dict[str, Any]) -> Optional[str]:
    value = _first(
        data,
        "scheme_id",
        "schemeId",
        "scheme",
    )

    if isinstance(value, dict):
        value = _first(value, "scheme_id", "id", "schemeId")

    return str(value).strip() if value is not None else None


def _get_profile(data: dict[str, Any]) -> dict[str, Any]:
    profile = data.get("profile")

    if isinstance(profile, dict) and profile:
        return deepcopy(profile)

    # Support flat profile fields used by some frontend forms.
    reserved = {
        "scheme_id",
        "schemeId",
        "scheme",
        "scheme_name",
        "schemeName",
        "applicant_name",
        "applicantName",
        "application_data",
        "applicationData",
        "documents",
        "status",
    }

    return {
        key: value
        for key, value in data.items()
        if key not in reserved and value is not None
    }


def _create_application_record(
    payload: ApplicationRequest,
) -> dict[str, Any]:
    data = payload.model_dump(exclude_none=True)

    scheme_id = _get_scheme_id(data)
    if not scheme_id:
        raise HTTPException(
            status_code=422,
            detail="scheme_id is required to create an application.",
        )

    scheme = get_scheme_by_id(scheme_id)
    if scheme is None:
        raise HTTPException(
            status_code=404,
            detail=f"Scheme '{scheme_id}' was not found.",
        )

    profile = _get_profile(data)
    if not profile:
        raise HTTPException(
            status_code=422,
            detail="A candidate profile is required for the application.",
        )

    eligibility = evaluate_scheme(profile, scheme)

    # Do not claim that the candidate is officially eligible when the
    # scheme's requirements are unverified or required information is absent.
    eligibility_status = eligibility.get(
        "eligibility_status",
        "needs information",
    )

    initial_status = _normalize_status(data.get("status", "draft"))

    # This endpoint records a draft or submitted application. It does not
    # submit anything to an external government portal or guarantee approval.
    if initial_status in {"approved", "rejected", "under review"}:
        raise HTTPException(
            status_code=422,
            detail=(
                "A new application must begin as draft or submitted. "
                "Review and decision statuses must be updated separately."
            ),
        )

    application_id = str(uuid.uuid4())
    timestamp = _now()

    application_data = data.get("application_data")
    if not isinstance(application_data, dict):
        application_data = {}

    documents = data.get("documents", [])
    if not isinstance(documents, list):
        documents = []

    record = {
        "application_id": application_id,
        "id": application_id,
        "scheme_id": scheme_id,
        "scheme_name": (
            _first(data, "scheme_name", "schemeName")
            or _first(_to_dict(scheme), "scheme_name_official", "scheme_name", "name")
            or "Government scheme"
        ),
        "applicant_name": (
            _first(data, "applicant_name", "applicantName")
            or _first(profile, "name", "full_name", "applicant_name")
            or ""
        ),
        "profile": profile,
        "application_data": application_data,
        "documents": documents,
        "eligibility_status": eligibility_status,
        "eligibility_result": eligibility,
        "status": initial_status,
        "remarks": "",
        "created_at": timestamp,
        "updated_at": timestamp,
        "submitted_at": timestamp if initial_status == "submitted" else None,
        "status_history": [
            {
                "status": initial_status,
                "timestamp": timestamp,
                "remarks": "Application record created.",
            }
        ],
    }

    return record


# ---------------------------------------------------------------------
# POST /api/applications
# ---------------------------------------------------------------------

@router.post("")
@router.post("/")
async def create_application(payload: ApplicationRequest):
    """
    Create an application draft or record a submitted status.

    Setting status='submitted' records that status locally. It does not
    transmit the application to an official government portal.
    """
    try:
        record = _create_application_record(payload)

        with _application_lock:
            _applications[record["application_id"]] = deepcopy(record)

        return {
            "success": True,
            "application": record,
            "data": record,
            "application_id": record["application_id"],
            "message": (
                "Application draft saved successfully."
                if record["status"] == "draft"
                else "Application status recorded locally."
            ),
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Failed to create application")
        raise HTTPException(
            status_code=500,
            detail="Could not create the application. Check backend logs.",
        ) from exc


# ---------------------------------------------------------------------
# GET /api/applications
# ---------------------------------------------------------------------

@router.get("")
@router.get("/")
async def list_applications(
    status: Optional[str] = Query(default=None),
    scheme_id: Optional[str] = Query(default=None),
):
    """List locally saved applications, optionally filtered."""
    with _application_lock:
        records = [
            deepcopy(record)
            for record in _applications.values()
        ]

    if status:
        requested_status = _normalize_status(status)
        records = [
            record for record in records
            if record.get("status") == requested_status
        ]

    if scheme_id:
        records = [
            record for record in records
            if str(record.get("scheme_id")) == str(scheme_id)
        ]

    records.sort(
        key=lambda item: item.get("created_at", ""),
        reverse=True,
    )

    return {
        "success": True,
        "total": len(records),
        "applications": records,
        "data": records,
        "message": "Applications retrieved successfully.",
    }


# ---------------------------------------------------------------------
# GET /api/applications/{application_id}
# ---------------------------------------------------------------------

@router.get("/{application_id}")
async def get_application(application_id: str):
    """Retrieve one application by its ID."""
    with _application_lock:
        record = _applications.get(application_id)

        if record is None:
            raise HTTPException(
                status_code=404,
                detail=f"Application '{application_id}' was not found.",
            )

        result = deepcopy(record)

    return {
        "success": True,
        "application": result,
        "data": result,
    }


# ---------------------------------------------------------------------
# PATCH /api/applications/{application_id}
# ---------------------------------------------------------------------

@router.patch("/{application_id}")
async def update_application_status(
    application_id: str,
    payload: ApplicationStatusUpdate,
):
    """Update an application's tracking status and optional remarks."""
    new_status = _normalize_status(payload.status)

    with _application_lock:
        record = _applications.get(application_id)

        if record is None:
            raise HTTPException(
                status_code=404,
                detail=f"Application '{application_id}' was not found.",
            )

        old_status = record.get("status")

        # Avoid silently changing a final decision.
        if old_status in {"approved", "rejected", "withdrawn"}:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"This application is already marked '{old_status}'. "
                    "Create a separate administrative workflow to reverse it."
                ),
            )

        timestamp = _now()
        remarks = payload.remarks or ""

        record["status"] = new_status
        record["remarks"] = remarks
        record["updated_at"] = timestamp

        if new_status == "submitted" and not record.get("submitted_at"):
            record["submitted_at"] = timestamp

        record.setdefault("status_history", []).append(
            {
                "status": new_status,
                "timestamp": timestamp,
                "remarks": remarks,
            }
        )

        _applications[application_id] = record
        result = deepcopy(record)

    return {
        "success": True,
        "application": result,
        "data": result,
        "message": "Application status updated successfully.",
    }
