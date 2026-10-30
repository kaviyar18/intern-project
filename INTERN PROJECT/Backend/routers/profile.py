
"""
Candidate Profile Router
Project: AI-Powered Government Scholarship & Welfare Navigator

Endpoints:
    GET  /api/profile
    POST /api/profile
    PUT  /api/profile
    PATCH /api/profile

The profile is kept in memory for this development version.
No authentication is required.
"""

from __future__ import annotations

import logging
from copy import deepcopy
from threading import RLock
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/profile",
    tags=["Profile"],
)

# ---------------------------------------------------------------------
# Development storage
# ---------------------------------------------------------------------
# This is temporary process-local storage. Profiles are lost when the
# backend restarts and are not shared between multiple server workers.
# Replace it with persistent storage if profiles must survive restarts.

_profile_lock = RLock()
_saved_profile: dict[str, Any] = {}


# ---------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------

class ProfileRequest(BaseModel):
    """
    Flexible profile model to support existing frontend fields.

    Extra fields are retained instead of rejected, so fields added by the
    React frontend can pass through without requiring a schema change.
    """

    model_config = ConfigDict(extra="allow")

    name: str | None = None
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = None
    state: str | None = None
    domicile_state: str | None = None
    category: str | None = None
    education_level: str | None = None
    annual_family_income: float | None = Field(default=None, ge=0)
    disability_status: str | None = None
    disability_percentage: float | None = Field(
        default=None,
        ge=0,
        le=100,
    )


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def _model_to_dict(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict):
        return deepcopy(payload)

    if hasattr(payload, "model_dump"):
        return payload.model_dump(exclude_none=True)

    if hasattr(payload, "dict"):
        return payload.dict(exclude_none=True)

    return {}


def _clean_profile(data: dict[str, Any]) -> dict[str, Any]:
    """
    Remove transport-only keys and normalize common profile aliases.

    Original frontend keys are preserved; canonical keys are added only
    when a corresponding value exists.
    """
    result = deepcopy(data)

    nested = result.get("profile")
    if isinstance(nested, dict):
        result = {**result, **nested}
        result.pop("profile", None)

    aliases = {
        "education_level": (
            "education_level",
            "education",
            "current_education",
            "educationLevel",
        ),
        "annual_family_income": (
            "annual_family_income",
            "family_income",
            "annual_income",
            "familyIncome",
        ),
        "domicile_state": (
            "domicile_state",
            "state",
            "residence_state",
        ),
        "disability_status": (
            "disability_status",
            "disability",
            "has_disability",
        ),
        "category": (
            "category",
            "social_category",
            "caste_category",
        ),
    }

    for canonical, candidates in aliases.items():
        for key in candidates:
            value = result.get(key)
            if value is not None and str(value).strip() != "":
                result[canonical] = value
                break

    # Keep canonical fields and any additional frontend-specific fields.
    return {
        key: value
        for key, value in result.items()
        if value is not None
    }


def _store_profile(data: dict[str, Any], *, merge: bool) -> dict[str, Any]:
    cleaned = _clean_profile(data)

    if not cleaned:
        raise HTTPException(
            status_code=422,
            detail="The submitted profile contains no usable fields.",
        )

    with _profile_lock:
        if merge:
            _saved_profile.update(cleaned)
        else:
            _saved_profile.clear()
            _saved_profile.update(cleaned)

        return deepcopy(_saved_profile)


def _get_profile_snapshot() -> dict[str, Any]:
    with _profile_lock:
        return deepcopy(_saved_profile)


# ---------------------------------------------------------------------
# GET /api/profile
# ---------------------------------------------------------------------

@router.get("")
@router.get("/")
async def get_profile():
    """Return the currently saved profile."""
    profile = _get_profile_snapshot()

    return {
        "success": True,
        "profile": profile,
        "data": profile,
        "exists": bool(profile),
        "message": (
            "Profile retrieved successfully."
            if profile
            else "No profile has been saved yet."
        ),
    }


# ---------------------------------------------------------------------
# POST /api/profile
# ---------------------------------------------------------------------

@router.post("")
@router.post("/")
async def create_or_save_profile(payload: ProfileRequest):
    """Create or replace the saved profile."""
    try:
        data = _model_to_dict(payload)
        profile = _store_profile(data, merge=False)

        return {
            "success": True,
            "profile": profile,
            "data": profile,
            "message": "Profile saved successfully.",
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Could not save candidate profile")
        raise HTTPException(
            status_code=500,
            detail="Could not save the profile. Check the backend logs.",
        ) from exc


# ---------------------------------------------------------------------
# PUT /api/profile
# ---------------------------------------------------------------------

@router.put("")
@router.put("/")
async def replace_profile(payload: ProfileRequest):
    """Replace the entire saved profile."""
    try:
        profile = _store_profile(
            _model_to_dict(payload),
            merge=False,
        )

        return {
            "success": True,
            "profile": profile,
            "data": profile,
            "message": "Profile updated successfully.",
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Could not replace candidate profile")
        raise HTTPException(
            status_code=500,
            detail="Could not update the profile. Check the backend logs.",
        ) from exc


# ---------------------------------------------------------------------
# PATCH /api/profile
# ---------------------------------------------------------------------

@router.patch("")
@router.patch("/")
async def update_profile_fields(payload: ProfileRequest):
    """Update supplied fields while preserving existing fields."""
    try:
        profile = _store_profile(
            _model_to_dict(payload),
            merge=True,
        )

        return {
            "success": True,
            "profile": profile,
            "data": profile,
            "message": "Profile fields updated successfully.",
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Could not partially update candidate profile")
        raise HTTPException(
            status_code=500,
            detail="Could not update the profile. Check the backend logs.",
        ) from exc


# ---------------------------------------------------------------------
# DELETE /api/profile
# ---------------------------------------------------------------------

@router.delete("")
@router.delete("/")
async def clear_profile():
    """Clear the saved development profile."""
    with _profile_lock:
        _saved_profile.clear()

    return {
        "success": True,
        "profile": {},
        "data": {},
        "message": "Saved profile cleared successfully.",
    }
