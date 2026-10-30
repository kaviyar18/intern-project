"""Recommendation API backed by the existing recommendation service."""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

try:
    from services.recommendation_service import (
        build_recommendation_response,
    )
except ImportError:
    from backend.services.recommendation_service import (
        build_recommendation_response,
    )


router = APIRouter(
    prefix="/api/recommendations",
    tags=["Recommendations"],
)


class RecommendationRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    profile: dict[str, Any] = Field(default_factory=dict)
    limit: int = Field(default=10, ge=1, le=100)
    filters: dict[str, Any] = Field(default_factory=dict)


def _resolve_profile(
    payload: RecommendationRequest,
) -> dict[str, Any]:
    """Support both nested and flat profile request formats."""

    data = payload.model_dump(exclude_none=True)

    nested_profile = data.get("profile")

    if isinstance(nested_profile, dict) and nested_profile:
        return nested_profile

    reserved_fields = {
        "profile",
        "limit",
        "filters",
    }

    return {
        key: value
        for key, value in data.items()
        if key not in reserved_fields
    }


@router.post("")
@router.post("/")
async def get_recommendations(
    payload: RecommendationRequest,
):
    try:
        profile = _resolve_profile(payload)

        if not profile:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Profile details are required to generate "
                    "scheme recommendations."
                ),
            )

        result = build_recommendation_response(
            profile=profile,
            limit=payload.limit,
            filters=payload.filters,
        )

        if not isinstance(result, dict):
            raise HTTPException(
                status_code=500,
                detail=(
                    "The recommendation service returned "
                    "an invalid response."
                ),
            )

        return {
            "success": True,
            **result,
        }

    except HTTPException:
        raise

    except Exception as exc:
        print(
            "Recommendation generation failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not generate scheme recommendations. "
                "Check the backend terminal for details."
            ),
        ) from exc