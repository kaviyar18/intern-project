
"""
Government Schemes Router
Project: AI-Powered Government Scholarship & Welfare Navigator

Endpoints:
    GET /api/schemes
    GET /api/schemes/filters
    GET /api/schemes/{scheme_id}

Uses the existing scheme_service.py.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

try:
    from services.scheme_service import (
        get_all_schemes,
        get_scheme_by_id,
    )
except ImportError:
    from backend.services.scheme_service import (
        get_all_schemes,
        get_scheme_by_id,
    )


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/schemes",
    tags=["Government Schemes"],
)


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def _to_dict(value: Any) -> dict[str, Any]:
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


def _normalise(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).strip().lower().split())


def _first(data: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = data.get(key)
        if value is not None and str(value).strip():
            return value
    return None


def _scheme_id(scheme: Any) -> str:
    data = _to_dict(scheme)
    return str(_first(data, "scheme_id", "id") or "")


def _scheme_name(scheme: Any) -> str:
    data = _to_dict(scheme)
    return str(
        _first(
            data,
            "scheme_name_official",
            "scheme_name",
            "name",
            "title",
        )
        or "Unnamed scheme"
    )


def _contains(value: Any, search: str) -> bool:
    return search in _normalise(value)


def _matches_filter(value: Any, selected: Optional[str]) -> bool:
    if not selected:
        return True

    selected_value = _normalise(selected)
    if not selected_value or selected_value == "all":
        return True

    if isinstance(value, (list, tuple, set)):
        return any(
            selected_value in _normalise(item)
            for item in value
        )

    return selected_value in _normalise(value)


def _unique_values(schemes: list[Any], *keys: str) -> list[str]:
    values: set[str] = set()

    for scheme in schemes:
        data = _to_dict(scheme)
        value = _first(data, *keys)

        if value is None:
            continue

        if isinstance(value, (list, tuple, set)):
            candidates = value
        else:
            text = str(value).strip()
            if not text:
                continue

            # Values in the source CSV may contain comma-separated items.
            candidates = text.replace("|", ",").replace(";", ",").split(",")

        for candidate in candidates:
            item = str(candidate).strip()
            if item and item.lower() not in {
                "unknown",
                "not specified",
                "not available",
                "none",
                "n/a",
            }:
                values.add(item)

    return sorted(values, key=str.lower)


# ---------------------------------------------------------------------
# GET /api/schemes/filters
# Register this route before /{scheme_id}.
# ---------------------------------------------------------------------

@router.get("/filters")
async def get_scheme_filters():
    """Return distinct filter options derived from the scheme dataset."""
    try:
        schemes = get_all_schemes() or []

        return {
            "success": True,
            "filters": {
                "education_levels": _unique_values(
                    schemes,
                    "education_levels",
                    "education_level",
                ),
                "categories": _unique_values(
                    schemes,
                    "eligible_categories",
                    "category_criteria",
                ),
                "states": _unique_values(
                    schemes,
                    "domicile_criteria",
                    "domicile_state",
                    "eligible_state",
                ),
                "genders": _unique_values(
                    schemes,
                    "gender_criteria",
                    "eligible_gender",
                ),
                "disability_criteria": _unique_values(
                    schemes,
                    "disability_criteria",
                    "eligible_disability",
                ),
            },
            "message": "Scheme filter options retrieved successfully.",
        }

    except Exception as exc:
        logger.exception("Could not retrieve scheme filters")
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve scheme filters. Check backend logs.",
        ) from exc


# ---------------------------------------------------------------------
# GET /api/schemes
# ---------------------------------------------------------------------

@router.get("")
@router.get("/")
async def list_schemes(
    search: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    education_level: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    gender: Optional[str] = Query(default=None),
    disability: Optional[str] = Query(default=None),
    verification_status: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """
    List and filter schemes.

    Supported query parameters:
      search / q
      education_level
      category
      state
      gender
      disability
      verification_status
      limit
      offset
    """
    try:
        schemes = get_all_schemes() or []
        search_text = _normalise(search or q)

        filtered: list[Any] = []

        for scheme in schemes:
            data = _to_dict(scheme)

            if search_text:
                searchable = " ".join(
                    str(data.get(key, "") or "")
                    for key in (
                        "scheme_id",
                        "scheme_name_official",
                        "scheme_name",
                        "name",
                        "description",
                        "education_levels",
                        "eligible_categories",
                        "other_eligibility_criteria",
                    )
                )

                if not _contains(searchable, search_text):
                    continue

            if not _matches_filter(
                _first(data, "education_levels", "education_level"),
                education_level,
            ):
                continue

            if not _matches_filter(
                _first(data, "eligible_categories", "category_criteria"),
                category,
            ):
                continue

            if not _matches_filter(
                _first(
                    data,
                    "domicile_criteria",
                    "domicile_state",
                    "eligible_state",
                ),
                state,
            ):
                continue

            if not _matches_filter(
                _first(data, "gender_criteria", "eligible_gender"),
                gender,
            ):
                continue

            if not _matches_filter(
                _first(data, "disability_criteria", "eligible_disability"),
                disability,
            ):
                continue

            if not _matches_filter(
                data.get("verification_status"),
                verification_status,
            ):
                continue

            filtered.append(scheme)

        total = len(filtered)
        page = filtered[offset:offset + limit]

        records = []
        for scheme in page:
            data = _to_dict(scheme)
            data.setdefault("scheme_id", _scheme_id(scheme))
            data.setdefault("scheme_name", _scheme_name(scheme))
            records.append(data)

        return {
            "success": True,
            "total": total,
            "count": len(records),
            "limit": limit,
            "offset": offset,
            "schemes": records,
            "results": records,
            "data": records,
            "message": "Government schemes retrieved successfully.",
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Could not retrieve government schemes")
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve schemes. Check backend logs.",
        ) from exc


# ---------------------------------------------------------------------
# GET /api/schemes/{scheme_id}
# Keep this route after /filters and the list routes.
# ---------------------------------------------------------------------

@router.get("/{scheme_id}")
async def get_scheme_details(scheme_id: str):
    """Retrieve the full record for a particular scheme."""
    normalized_id = str(scheme_id).strip()

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

        data = _to_dict(scheme)

        if not data:
            raise HTTPException(
                status_code=500,
                detail="The scheme record could not be converted to a response.",
            )

        data.setdefault("scheme_id", _scheme_id(scheme))
        data.setdefault("scheme_name", _scheme_name(scheme))

        return {
            "success": True,
            "scheme": data,
            "data": data,
            "message": "Scheme details retrieved successfully.",
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception(
            "Could not retrieve scheme %s",
            normalized_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve scheme details. Check backend logs.",
        ) from exc
