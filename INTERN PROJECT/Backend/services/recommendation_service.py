"""
Profile-aware recommendation service for the Government Scholarship
& Welfare Navigator.

Ranks schemes using the existing eligibility assessment and a transparent
metadata relevance score. Unknown or unverified rules remain provisional;
they are not silently treated as confirmed eligibility.
"""

import re
from typing import Any, Dict, List, Optional


def _get_value(
    data: Any,
    *keys: str,
    default: Any = None,
) -> Any:
    for key in keys:
        value = (
            data.get(key)
            if isinstance(data, dict)
            else getattr(data, key, None)
        )

        if value is not None and str(value).strip() != "":
            return value

    return default


def _normalise(value: Any) -> str:
    return re.sub(
        r"\s+",
        " ",
        str(value or "").strip().casefold(),
    )


def _tokens(value: Any) -> List[str]:
    if value is None:
        return []

    if isinstance(value, (list, tuple, set)):
        raw = list(value)
    else:
        raw = re.split(r"[,;|/\n]+", str(value))

    return [
        _normalise(item)
        for item in raw
        if _normalise(item)
    ]


def _normalise_limit(limit: Any = 10) -> int:
    try:
        return max(1, min(int(limit), 100))
    except (TypeError, ValueError):
        return 10


def _scheme_id(
    scheme: Dict[str, Any],
) -> Optional[str]:
    value = _get_value(
        scheme,
        "scheme_id",
        "id",
        "scheme_code",
    )

    return str(value) if value is not None else None


def _scheme_name(scheme: Dict[str, Any]) -> str:
    return str(
        _get_value(
            scheme,
            "scheme_name_official",
            "scheme_name",
            "name",
            "title",
            default="Government Scheme",
        )
    )


def _get_schemes() -> List[Dict[str, Any]]:
    try:
        from services.scheme_service import get_all_schemes
    except ImportError:
        from backend.services.scheme_service import get_all_schemes

    result = get_all_schemes()

    if isinstance(result, dict):
        result = result.get(
            "schemes",
            result.get("results", []),
        )

    return [
        item
        if isinstance(item, dict)
        else item.model_dump()
        for item in (result or [])
        if isinstance(item, dict)
        or hasattr(item, "model_dump")
    ]


def _evaluate(
    profile: Any,
    scheme: Dict[str, Any],
) -> Dict[str, Any]:
    try:
        from services.eligibility_service import evaluate_scheme
    except ImportError:
        from backend.services.eligibility_service import evaluate_scheme

    result = evaluate_scheme(profile, scheme)

    return result if isinstance(result, dict) else {}


def _matches_filters(
    scheme: Dict[str, Any],
    filters: Optional[Dict[str, Any]],
) -> bool:
    if not filters:
        return True

    aliases = {
        "education_level": (
            "education_levels",
            "education_level",
            "education",
        ),
        "category": (
            "eligible_categories",
            "eligible_category",
            "category_criteria",
            "category",
        ),
        "state": (
            "state_or_ut",
            "domicile_criteria",
            "domicile",
            "state",
        ),
        "gender": (
            "gender_criteria",
            "eligible_gender",
            "gender",
        ),
    }

    for filter_name, requested in filters.items():
        if requested in (None, "", [], ()):
            continue

        keys = aliases.get(filter_name, (filter_name,))
        actual = _get_value(scheme, *keys)

        # Missing scheme metadata cannot establish a filter mismatch.
        if actual is None:
            continue

        requested_values = (
            requested
            if isinstance(requested, (list, tuple, set))
            else [requested]
        )

        actual_text = _normalise(actual)

        if not any(
            _normalise(value) in actual_text
            for value in requested_values
        ):
            return False

    return True


def _profile_relevance(
    profile: Any,
    scheme: Dict[str, Any],
) -> int:
    """
    Add a transparent ranking bonus for recorded profile matches.

    This score ranks relevant schemes; it does not decide eligibility.
    Eligibility is assessed separately by evaluate_scheme().
    """
    score = 0

    # Social category
    category = _get_value(
        profile,
        "category",
        "social_category",
        "caste_category",
    )

    eligible_categories = _get_value(
        scheme,
        "eligible_categories",
        "eligible_category",
        "category",
    )

    if category and eligible_categories:
        cat = _normalise(category)
        scheme_categories = _normalise(eligible_categories)
        category_tokens = _tokens(eligible_categories)

        if (
            cat in category_tokens
            or re.search(
                rf"(^|[^a-z]){re.escape(cat)}([^a-z]|$)",
                scheme_categories,
            )
        ):
            score += 40

        elif (
            "all" in category_tokens
            or "all categories" in scheme_categories
            or "any category" in scheme_categories
        ):
            score += 12

    # Education level
    education = _normalise(
        _get_value(
            profile,
            "education_level",
            "education",
            "current_education",
            "educationLevel",
        )
    )

    scheme_education = _normalise(
        _get_value(
            scheme,
            "education_levels",
            "education_level",
            "education",
        )
    )

    if education and scheme_education:
        education_aliases = {
            "undergraduate": (
                "undergraduate",
                "under graduate",
                "ug",
                "college",
                "post-matric",
            ),
            "postgraduate": (
                "postgraduate",
                "post graduate",
                "pg",
                "higher education",
            ),
            "school": (
                "school",
                "pre-matric",
                "post-matric",
            ),
            "diploma": (
                "diploma",
                "technical diploma",
            ),
        }

        terms = education_aliases.get(
            education,
            (education,),
        )

        if any(
            term in scheme_education
            for term in terms
        ):
            score += 20

    # State / domicile
    state = _normalise(
        _get_value(
            profile,
            "state",
            "domicile_state",
            "residence_state",
            "domicile",
        )
    )

    scheme_state = _normalise(
        _get_value(
            scheme,
            "state_or_ut",
            "state",
            "domicile_criteria",
        )
    )

    if state and scheme_state:
        if (
            "all" in _tokens(scheme_state)
            or "india" in scheme_state
        ):
            score += 5
        elif state in scheme_state:
            score += 15

    # Annual family income
    income = _get_value(
        profile,
        "annual_family_income",
        "family_income",
        "annual_income",
        "income",
        "familyIncome",
    )

    limit = _get_value(
        scheme,
        "income_limit_amount",
        "income_limit",
        "annual_income_limit",
        "maximum_family_income",
    )

    try:
        income_num = (
            float(
                re.sub(
                    r"[^0-9.]",
                    "",
                    str(income).replace(",", ""),
                )
            )
            if income is not None
            else None
        )

        limit_num = (
            float(
                re.sub(
                    r"[^0-9.]",
                    "",
                    str(limit).replace(",", ""),
                )
            )
            if limit is not None
            else None
        )

        if (
            income_num is not None
            and limit_num is not None
            and limit_num > 0
            and income_num <= limit_num
        ):
            score += 10

    except (TypeError, ValueError):
        pass

    # Additional relevance for explicitly targeted communities
    community = _normalise(
        _get_value(
            scheme,
            "eligible_community_groups",
        )
    )

    name = _normalise(_scheme_name(scheme))

    if category and _normalise(category) == "sc":
        if (
            "scheduled caste" in community
            or re.search(r"\bsc\b", community)
            or "scheduled caste" in name
        ):
            score += 25

    return score


def _build_recommendation(
    profile: Any,
    scheme: Dict[str, Any],
) -> Dict[str, Any]:
    assessment = _evaluate(profile, scheme)

    eligibility = assessment.get(
        "eligible",
        assessment.get("is_eligible"),
    )

    scheme_verification = _normalise(
        _get_value(
            scheme,
            "verification_status",
            default="",
        )
    )

    verification_pending = bool(
        assessment.get("verification_pending", False)
        or any(
            word in scheme_verification
            for word in (
                "candidate",
                "pending",
                "needs_review",
                "unverified",
                "requires review",
            )
        )
    )

    if verification_pending:
        eligibility = None

    if eligibility is True:
        ranking_group = 0
        status = "eligible"

    elif eligibility is None:
        ranking_group = 1
        status = "needs_review"

    else:
        ranking_group = 2
        status = "not_eligible"

    try:
        eligibility_score = float(
            assessment.get(
                "eligibility_score",
                assessment.get("match_score", 0),
            )
            or 0
        )
    except (TypeError, ValueError):
        eligibility_score = 0.0

    recommendation = dict(scheme)

    recommendation.update({
        "scheme_id": _scheme_id(scheme),
        "scheme_name": _scheme_name(scheme),
        "eligible": eligibility,
        "eligibility_status": status,
        "eligibility_score": eligibility_score,
        "match_score": eligibility_score,
        "profile_relevance_score": _profile_relevance(
            profile,
            scheme,
        ),
        "ranking_group": ranking_group,
        "verification_pending": verification_pending,
        "criteria": assessment.get("criteria", []),
        "summary": assessment.get("summary", ""),
        "message": assessment.get("message", ""),
        "explanation": assessment.get(
            "explanation",
            assessment.get("xai_explanation", ""),
        ),
        "xai_explanation": assessment.get(
            "xai_explanation",
            assessment.get("explanation", ""),
        ),
        "passed_criteria": assessment.get(
            "passed_criteria",
            [],
        ),
        "failed_criteria": assessment.get(
            "failed_criteria",
            [],
        ),
        "missing_criteria": assessment.get(
            "missing_criteria",
            [],
        ),
        "feature_importance": assessment.get(
            "feature_importance",
            {},
        ),
    })

    return recommendation


def rank_schemes(
    profile: Any,
    schemes: Optional[List[Dict[str, Any]]] = None,
    top_n: int = 10,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    limit = _normalise_limit(top_n)

    scheme_list = (
        schemes
        if schemes is not None
        else _get_schemes()
    )

    recommendations = []

    for scheme in scheme_list:
        if not isinstance(scheme, dict):
            if hasattr(scheme, "model_dump"):
                scheme = scheme.model_dump()
            else:
                continue

        if not _matches_filters(scheme, filters):
            continue

        try:
            recommendations.append(
                _build_recommendation(profile, scheme)
            )

        except (ValueError, TypeError, KeyError) as exc:
            fallback = dict(scheme)

            fallback.update({
                "scheme_id": _scheme_id(scheme),
                "scheme_name": _scheme_name(scheme),
                "eligible": None,
                "eligibility_status": "needs_review",
                "eligibility_score": 0.0,
                "match_score": 0.0,
                "profile_relevance_score": _profile_relevance(
                    profile,
                    scheme,
                ),
                "ranking_group": 1,
                "verification_pending": True,
                "criteria": [],
                "summary": (
                    "Eligibility could not be assessed reliably."
                ),
                "message": (
                    "Review this scheme's data and eligibility rules."
                ),
                "explanation": str(exc),
                "xai_explanation": str(exc),
                "passed_criteria": [],
                "failed_criteria": [],
                "missing_criteria": [],
                "feature_importance": {},
            })

            recommendations.append(fallback)

    recommendations.sort(
        key=lambda item: (
            item.get("ranking_group", 1),
            -item.get("profile_relevance_score", 0),
            -item.get("eligibility_score", 0.0),
            item.get("scheme_name", "").casefold(),
        )
    )

    return recommendations[:limit]


def recommend_schemes(
    profile: Any,
    limit: int = 10,
    top_n: Optional[int] = None,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    requested_limit = (
        top_n
        if top_n is not None
        else limit
    )

    return rank_schemes(
        profile=profile,
        top_n=requested_limit,
        filters=filters,
    )


def get_recommendations(
    profile: Any,
    top_n: int = 10,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    return recommend_schemes(
        profile=profile,
        top_n=top_n,
        filters=filters,
    )


def build_recommendation_response(
    profile: Any,
    limit: int = 10,
    filters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    recommendations = recommend_schemes(
        profile=profile,
        limit=limit,
        filters=filters,
    )

    return {
        "total": len(recommendations),
        "recommendations": recommendations,
        "results": recommendations,
        "eligible_schemes": [
            item
            for item in recommendations
            if item.get("eligible") is True
        ],
        "needs_information": [
            item
            for item in recommendations
            if item.get("eligible") is None
        ],
        "ineligible_schemes": [
            item
            for item in recommendations
            if item.get("eligible") is False
        ],
    }