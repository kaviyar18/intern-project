
"""
Eligibility Router
Project: AI-Powered Government Scholarship & Welfare Navigator

Endpoints:
    POST /api/eligibility
    GET  /api/eligibility/{scheme_id}

This router delegates eligibility evaluation to eligibility_service.py.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

try:
    from services.eligibility_service import (
        evaluate_scheme,
        format_eligibility_response,
        run_scheme_eligibility,
    )
    from services.scheme_service import (
        get_all_schemes,
        get_scheme_by_id,
    )
except ImportError:
    from backend.services.eligibility_service import (
        evaluate_scheme,
        format_eligibility_response,
        run_scheme_eligibility,
    )
    from backend.services.scheme_service import (
        get_all_schemes,
        get_scheme_by_id,
    )


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/eligibility",
    tags=["Eligibility"],
)


# ---------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------

class EligibilityRequest(BaseModel):
    """Accept the profile and optional scheme identifier from the UI."""

    model_config = ConfigDict(extra="allow")

    profile: dict[str, Any] = Field(default_factory=dict)
    scheme_id: Optional[str] = None


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def _model_to_dict(value: Any) -> dict[str, Any]:
    """Support Pydantic models and ordinary dictionaries."""
    if value is None:
        return {}

    if isinstance(value, dict):
        return value

    if hasattr(value, "model_dump"):
        return value.model_dump(exclude_none=True)

    if hasattr(value, "dict"):
        return value.dict(exclude_none=True)

    try:
        return dict(value)
    except (TypeError, ValueError):
        return {}


def _normalise_scheme_id(value: Any) -> Optional[str]:
    if value is None:
        return None

    text = str(value).strip()
    return text or None


def _get_request_profile(payload: EligibilityRequest) -> dict[str, Any]:
    """
    Resolve common frontend payload formats.

    Accepted examples:
        {"profile": {...}, "scheme_id": "IND-GOV-001"}
        {"profile": {...}, "schemeId": "IND-GOV-001"}
        {"education_level": "...", "annual_family_income": 100000}
    """
    data = payload.model_dump(exclude_none=True)

    profile = data.get("profile")

    if isinstance(profile, dict):
        return profile

    # Also accept a flat profile payload.
    reserved_keys = {
        "scheme_id",
        "schemeId",
        "profile",
    }

    return {
        key: value
        for key, value in data.items()
        if key not in reserved_keys
    }


def _get_scheme_id(payload: EligibilityRequest) -> Optional[str]:
    data = payload.model_dump(exclude_none=True)

    return _normalise_scheme_id(
        data.get("scheme_id")
        or data.get("schemeId")
        or data.get("scheme")
    )


def _evaluate_one(
    profile: dict[str, Any],
    scheme: Any,
) -> dict[str, Any]:
    result = evaluate_scheme(profile, scheme)
    return format_eligibility_response(result)


def _error_response(
    message: str,
    *,
    scheme_id: Optional[str] = None,
) -> dict[str, Any]:
    return {
        "success": False,
        "scheme_id": scheme_id,
        "eligible": None,
        "eligibility_status": "needs information",
        "eligibility_score": 0,
        "criteria": [],
        "passed_criteria": [],
        "failed_criteria": [],
        "missing_criteria": [],
        "summary": message,
        "message": message,
        "explanation": message,
        "xai_explanation": message,
        "xai_explanation_eligible": "",
        "xai_explanation_not_eligible": "",
        "feature_importance": [],
        "verification_pending": True,
    }


# ---------------------------------------------------------------------
# POST /api/eligibility
# ---------------------------------------------------------------------

@router.post("")
@router.post("/")
async def check_eligibility(payload: EligibilityRequest):
    """
    Evaluate eligibility for a selected scheme.

    If scheme_id is supplied, return a result for that scheme.
    Otherwise, evaluate the profile against all available schemes.
    """
    profile = _get_request_profile(payload)
    scheme_id = _get_scheme_id(payload)

    if not profile:
        raise HTTPException(
            status_code=422,
            detail="A candidate profile is required to check eligibility.",
        )

    try:
        if scheme_id:
            scheme = get_scheme_by_id(scheme_id)

            if scheme is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Scheme '{scheme_id}' was not found.",
                )

            result = _evaluate_one(profile, scheme)

            return {
                "success": True,
                **result,
            }

        schemes = get_all_schemes() or []

        if not schemes:
            return {
                "success": True,
                "profile": profile,
                "total_schemes": 0,
                "results": [],
                "eligible_schemes": [],
                "ineligible_schemes": [],
                "needs_information_schemes": [],
                "message": "No scheme records are currently available.",
            }

        results = []

        for scheme in schemes:
            try:
                results.append(_evaluate_one(profile, scheme))
            except Exception:
                logger.exception(
                    "Eligibility evaluation failed for a scheme"
                )
                results.append(
                    _error_response(
                        "This scheme could not be evaluated. "
                        "Check the scheme record and try again.",
                        scheme_id=str(
                            _model_to_dict(scheme).get("scheme_id", "")
                        ) or None,
                    )
                )

        eligible_schemes = [
            item for item in results
            if item.get("eligible") is True
        ]

        ineligible_schemes = [
            item for item in results
            if item.get("eligible") is False
        ]

        needs_information_schemes = [
            item for item in results
            if item.get("eligible") is None
        ]

        return {
            "success": True,
            "profile": profile,
            "total_schemes": len(results),
            "results": results,
            "eligible_schemes": eligible_schemes,
            "ineligible_schemes": ineligible_schemes,
            "needs_information_schemes": needs_information_schemes,
            "message": (
                "Eligibility evaluation completed. Results marked "
                "'needs information' require additional details or "
                "official verification."
            ),
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Eligibility endpoint failed")
        raise HTTPException(
            status_code=500,
            detail="Eligibility assessment failed. Check the backend logs.",
        ) from exc


# ---------------------------------------------------------------------
# GET /api/eligibility/{scheme_id}
# ---------------------------------------------------------------------

@router.get("/{scheme_id}")
async def get_scheme_eligibility(scheme_id: str):
    """
    Return the scheme record so the frontend can display its details.

    A candidate profile is not available in this GET request, so this
    endpoint does not claim to assess a candidate's eligibility.
    """
    normalized_id = _normalise_scheme_id(scheme_id)

    if not normalized_id:
        raise HTTPException(
            status_code=400,
            detail="A valid scheme ID is required.",
        )

    try:
        scheme = get_scheme_by_id(normalized_id)

        if scheme is None:
            raise HTTPException(
                status_code=404,
                detail=f"Scheme '{normalized_id}' was not found.",
            )

        scheme_data = _model_to_dict(scheme)

        if not scheme_data:
            raise HTTPException(
                status_code=500,
                detail="The scheme record could not be converted to a response.",
            )

        return {
            "success": True,
            "scheme": scheme_data,
            "scheme_id": normalized_id,
            "message": (
                "Scheme details retrieved. Submit a candidate profile "
                "to assess eligibility."
            ),
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception(
            "Could not retrieve scheme details for %s",
            normalized_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve scheme details.",
        ) from exc
