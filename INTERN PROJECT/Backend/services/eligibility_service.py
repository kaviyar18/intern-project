
from __future__ import annotations

import re
from typing import Any, Optional

MET = "met"
NOT_MET = "not met"
NEEDS_INFO = "information needed"

UNKNOWN_VALUES = {
    "", "unknown", "not known", "not specified", "not available",
    "n/a", "na", "none", "null", "nil", "not provided",
    "to be confirmed", "to be verified", "verification required",
    "requires verification", "requires official verification",
    "requires scheme specific verification", "scheme specific",
    "scheme-specific", "candidate listing", "exact value not established",
    "see current scheme", "check official notification",
    "as per official notification", "varies by scheme", "depends on scheme",
}

TRUE_VALUES = {"yes", "true", "1", "eligible", "required", "applicable"}
FALSE_VALUES = {"no", "false", "0", "not eligible", "not required", "not applicable"}


def _normalise(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    text = str(value).strip().lower()
    return re.sub(r"\s+", " ", text)


def _first_value(data: Any, *keys: str) -> Any:
    if data is None:
        return None

    for key in keys:
        if isinstance(data, dict):
            value = data.get(key)
        else:
            value = getattr(data, key, None)

        if value is not None and str(value).strip() != "":
            return value

    return None


def _profile_value(profile: Any, *keys: str) -> Any:
    value = _first_value(profile, *keys)
    if value is not None:
        return value

    # Support profiles whose values are stored inside nested objects.
    for nested_key in ("personal_details", "personal_info", "education_details",
                       "family_details", "user_profile", "details"):
        nested = _first_value(profile, nested_key)
        value = _first_value(nested, *keys)
        if value is not None:
            return value

    return None


def _scheme_value(scheme: Any, *keys: str) -> Any:
    return _first_value(scheme, *keys)


def _is_unknown(value: Any) -> bool:
    text = _normalise(value)
    if text in UNKNOWN_VALUES:
        return True

    return any(
        phrase in text
        for phrase in (
            "requires official verification",
            "exact value not established",
            "check official notification",
            "verification pending",
            "not yet verified",
        )
    )


def _to_number(value: Any) -> Optional[float]:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip().lower()
    if not text or _is_unknown(text):
        return None

    text = text.replace(",", "")
    text = re.sub(r"\b(inr|rs\.?|rupees?)\b", "", text)
    text = text.replace("₹", "").replace(" ", "")

    match = re.fullmatch(r"-?\d+(?:\.\d+)?", text)
    if not match:
        return None

    try:
        return float(text)
    except ValueError:
        return None


def _to_list(value: Any) -> list[str]:
    if value is None:
        return []

    if isinstance(value, (list, tuple, set)):
        values = list(value)
    else:
        text = str(value).strip()
        if not text or _is_unknown(text):
            return []
        values = re.split(r"[,;|\n]", text)

    return [_normalise(item) for item in values if _normalise(item)]


def _canonical(value: Any, field: str) -> str:
    text = _normalise(value)
    compact = re.sub(r"[^a-z0-9]+", " ", text).strip()

    if field == "category":
        aliases = {
            "sc": "sc",
            "scheduled caste": "sc",
            "scheduled castes": "sc",
            "st": "st",
            "scheduled tribe": "st",
            "scheduled tribes": "st",
            "obc": "obc",
            "other backward class": "obc",
            "other backward classes": "obc",
            "general": "general",
            "unreserved": "general",
            "ews": "ews",
            "economically weaker section": "ews",
        }
        return aliases.get(compact, compact)

    if field == "gender":
        aliases = {
            "m": "male", "man": "male", "boy": "male",
            "f": "female", "woman": "female", "girl": "female",
            "transgender person": "transgender",
        }
        return aliases.get(compact, compact)

    if field == "education":
        aliases = {
            "ug": "undergraduate",
            "under graduate": "undergraduate",
            "bachelor": "undergraduate",
            "bachelors": "undergraduate",
            "graduation": "undergraduate",
            "pg": "postgraduate",
            "post graduate": "postgraduate",
            "masters": "postgraduate",
            "master degree": "postgraduate",
            "phd": "doctoral",
            "ph d": "doctoral",
            "class 10": "secondary",
            "10th": "secondary",
            "class 12": "higher secondary",
            "12th": "higher secondary",
            "higher secondary": "higher secondary",
            "senior secondary": "higher secondary",
        }
        return aliases.get(compact, compact)

    if field == "state":
        aliases = {
            "tamilnadu": "tamil nadu",
            "orissa": "odisha",
            "pondicherry": "puducherry",
        }
        return aliases.get(compact, compact)

    if field == "disability":
        if compact in {"yes", "true", "pwd", "person with disability",
                       "person with disabilities", "disabled"}:
            return "yes"
        if compact in {"no", "false", "not disabled", "no disability"}:
            return "no"

    return compact


def _matches(candidate: Any, requirement: Any, field: str) -> Optional[bool]:
    if _is_unknown(candidate) or _is_unknown(requirement):
        return None

    candidate_text = _normalise(candidate)
    requirement_text = _normalise(requirement)

    if not candidate_text or not requirement_text:
        return None

    # These values indicate no restriction rather than a literal value.
    unrestricted = {
        "all", "all categories", "any", "any gender", "all genders",
        "both", "open to all", "no restriction", "not applicable",
        "none", "all states", "india",
    }
    if requirement_text in unrestricted:
        return True

    candidate_values = _to_list(candidate)
    requirement_values = _to_list(requirement)

    # Compare canonicalized values for category, education, gender and state.
    candidate_values = [_canonical(v, field) for v in candidate_values]
    requirement_values = [_canonical(v, field) for v in requirement_values]

    if candidate_values and requirement_values:
        return any(
            candidate_item == requirement_item
            for candidate_item in candidate_values
            for requirement_item in requirement_values
        )

    return _canonical(candidate, field) == _canonical(requirement, field)


def _criterion(
    name: str,
    field: str,
    candidate: Any,
    requirement: Any,
    comparison: str = "match",
) -> dict[str, Any]:
    base = {
        "criterion": name,
        "field": field,
        "candidate_value": candidate,
        "requirement": requirement,
    }

    if _is_unknown(requirement):
        detail = f"The scheme's {name.lower()} requirement needs confirmation."
        return {
            **base, "status": NEEDS_INFO, "result": None,
            "detail": detail, "reason": detail, "explanation": detail,
        }

    if _is_unknown(candidate):
        detail = f"Your {name.lower()} information is missing from the profile."
        return {
            **base, "status": NEEDS_INFO, "result": None,
            "detail": detail, "reason": detail, "explanation": detail,
        }

    if comparison == "income_max":
        candidate_number = _to_number(candidate)
        requirement_number = _to_number(requirement)

        if candidate_number is None or requirement_number is None:
            detail = "Income could not be compared reliably. Check the income values and period."
            return {
                **base, "status": NEEDS_INFO, "result": None,
                "detail": detail, "reason": detail, "explanation": detail,
            }

        passed = candidate_number <= requirement_number
        detail = (
            f"Reported income ({candidate_number:g}) is within the recorded limit "
            f"({requirement_number:g})."
            if passed else
            f"Reported income ({candidate_number:g}) exceeds the recorded limit "
            f"({requirement_number:g})."
        )
    else:
        matched = _matches(candidate, requirement, field)
        if matched is None:
            detail = f"{name} cannot be compared reliably with the available information."
            return {
                **base, "status": NEEDS_INFO, "result": None,
                "detail": detail, "reason": detail, "explanation": detail,
            }
        passed = matched
        detail = (
            f"Your recorded {name.lower()} matches the recorded scheme requirement."
            if passed else
            f"Your recorded {name.lower()} does not match the recorded scheme requirement."
        )

    status = MET if passed else NOT_MET
    return {
        **base,
        "status": status,
        "result": passed,
        "detail": detail,
        "reason": detail,
        "explanation": detail,
    }


def evaluate_scheme(profile: Any, scheme: Any) -> dict[str, Any]:
    """Evaluate profile fields against recorded scheme fields without guessing."""

    if profile is None:
        profile = {}

    if scheme is None:
        return {
            "scheme_id": None,
            "scheme_name": None,
            "eligible": None,
            "eligibility_status": "needs information",
            "status": "needs_information",
            "eligibility_score": None,
            "criteria": [],
            "passed_criteria": [],
            "failed_criteria": [],
            "missing_criteria": ["scheme"],
            "summary": "No scheme record was provided.",
            "message": "Select a valid scheme before checking eligibility.",
            "explanation": "Eligibility could not be evaluated because the scheme record is missing.",
            "verification_pending": True,
            "verification_status": "unknown",
        }

    scheme_id = _scheme_value(scheme, "scheme_id", "scheme_key", "id")
    scheme_name = _scheme_value(
        scheme, "scheme_name_official", "scheme_name", "name", "title"
    )

    criteria: list[dict[str, Any]] = []

    # Field aliases support the current profile and CSV column names.
    field_specs = [
        (
            "Education level", "education",
            ("education_level", "education", "current_education", "educationLevel",
             "education_levels"),
            ("education_levels", "education_level", "education_criteria",
             "minimum_education"),
            "match",
        ),
        (
            "Social category", "category",
            ("category", "social_category", "caste_category", "community"),
            ("eligible_categories", "category_criteria", "eligible_category"),
            "match",
        ),
        (
            "Gender", "gender",
            ("gender", "sex"),
            ("gender_criteria", "eligible_gender", "gender"),
            "match",
        ),
        (
            "Domicile or state", "state",
            ("domicile_state", "state", "residence_state", "domicile",
             "state_or_ut"),
            ("domicile_criteria", "domicile_state", "eligible_state",
             "state_criteria", "state_or_ut"),
            "match",
        ),
        (
            "Disability", "disability",
            ("disability_status", "disability", "has_disability",
             "disability_percentage", "disability_status"),
            ("disability_criteria", "eligible_disability", "disability_requirement"),
            "match",
        ),
        (
            "Annual family income", "income",
            ("annual_family_income", "family_income", "annual_income", "income",
             "familyIncome"),
            ("income_limit_amount", "income_limit", "maximum_family_income",
             "annual_income_limit"),
            "income_max",
        ),
    ]

    for label, field, profile_keys, scheme_keys, comparison in field_specs:
        requirement = _scheme_value(scheme, *scheme_keys)
        # A missing scheme field is not a criterion; do not invent a restriction.
        if requirement is None or str(requirement).strip() == "":
            continue

        candidate = _profile_value(profile, *profile_keys)
        criteria.append(_criterion(label, field, candidate, requirement, comparison))

    # Merit criteria are only evaluated if both values can be interpreted numerically.
    merit_requirement = _scheme_value(
        scheme, "academic_merit_criteria", "minimum_percentage",
        "minimum_marks", "minimum_cgpa"
    )
    if merit_requirement is not None and str(merit_requirement).strip():
        candidate_merit = _profile_value(
            profile, "academic_percentage", "percentage", "marks_percentage",
            "academic_score", "cgpa"
        )
        requirement_number = _to_number(merit_requirement)
        candidate_number = _to_number(candidate_merit)

        if requirement_number is None or candidate_number is None:
            detail = (
                "Academic merit needs verification. Confirm the required score, "
                "the candidate's score, and whether marks or CGPA are used."
            )
            criteria.append({
                "criterion": "Academic merit",
                "field": "academic_merit",
                "candidate_value": candidate_merit,
                "requirement": merit_requirement,
                "status": NEEDS_INFO,
                "result": None,
                "detail": detail,
                "reason": detail,
                "explanation": detail,
            })
        else:
            passed = candidate_number >= requirement_number
            detail = (
                "The recorded academic score meets the numeric requirement."
                if passed else
                "The recorded academic score is below the numeric requirement."
            )
            criteria.append({
                "criterion": "Academic merit",
                "field": "academic_merit",
                "candidate_value": candidate_merit,
                "requirement": merit_requirement,
                "status": MET if passed else NOT_MET,
                "result": passed,
                "detail": detail,
                "reason": detail,
                "explanation": detail,
            })

    other_requirements = _scheme_value(
        scheme, "other_eligibility_criteria", "other_criteria",
        "additional_eligibility"
    )
    if other_requirements is not None and not _is_unknown(other_requirements):
        detail = (
            "Additional conditions are recorded but have not been individually "
            "evaluated. Review the current official scheme notification."
        )
        criteria.append({
            "criterion": "Other eligibility conditions",
            "field": "other_eligibility_criteria",
            "candidate_value": None,
            "requirement": other_requirements,
            "status": NEEDS_INFO,
            "result": None,
            "detail": detail,
            "reason": detail,
            "explanation": detail,
        })

    verification_status = _normalise(_scheme_value(
        scheme, "verification_status", "verification", "data_verification_status"
    ))
    explicitly_verified = verification_status in {
        "verified", "officially verified", "verified against official source",
        "confirmed",
    }

    review_fields = _scheme_value(
        scheme, "fields_requiring_review", "review_required_fields"
    )
    review_text = _normalise(review_fields)
    review_required = bool(review_text) and review_text not in {
        "none", "no", "false", "[]", "not required"
    }

    verification_pending = not explicitly_verified or review_required

    # Preserve the observed mismatch for explainability, but do not call it
    # a confirmed rejection while scheme data is not officially verified.
    if verification_pending:
        for item in criteria:
            if item["status"] == NOT_MET:
                item["recorded_result"] = NOT_MET
                item["status"] = NEEDS_INFO
                item["result"] = None
                item["detail"] += (
                    " The scheme data is not officially verified, so this is "
                    "not a confirmed eligibility rejection."
                )
                item["reason"] = item["detail"]
                item["explanation"] = item["detail"]

    passed_criteria = [c for c in criteria if c["status"] == MET]
    failed_criteria = [c for c in criteria if c["status"] == NOT_MET]
    missing_criteria = [c for c in criteria if c["status"] == NEEDS_INFO]

    # A percentage is shown only when the scheme data is verified and every
    # evaluated criterion is decidable. It is a criteria-match score, not probability.
    if verification_pending or missing_criteria or not criteria:
        score = None
    else:
        score = round(len(passed_criteria) / len(criteria) * 100)

    if verification_pending or missing_criteria or not criteria:
        eligible = None
        eligibility_status = "needs information"
        status = "needs_information"
        summary = "Eligibility is not confirmed."
        message = (
            "More information and/or official scheme verification is required "
            "before eligibility can be confirmed."
        )
    elif failed_criteria:
        eligible = False
        eligibility_status = "not eligible"
        status = "not_eligible"
        summary = "One or more verified eligibility criteria were not met."
        message = (
            "One or more evaluated criteria do not match the verified scheme "
            "requirements. Check the official notification before applying."
        )
    else:
        eligible = True
        eligibility_status = "eligible"
        status = "eligible"
        summary = "All evaluated criteria were met against the verified scheme data."
        message = (
            "The evaluated criteria are satisfied. Check the official scheme "
            "notification and application portal before submitting an application."
        )

    passed_names = [c["criterion"] for c in passed_criteria]
    failed_names = [c["criterion"] for c in failed_criteria]
    missing_names = [c["criterion"] for c in missing_criteria]
    explanation = " ".join(c["detail"] for c in criteria)
    if verification_pending:
        explanation += " Scheme data is pending official verification."

    feature_importance = [
        {
            "feature": c["criterion"],
            "field": c["field"],
            "status": c["status"],
            "importance": 1.0 if c["status"] == NOT_MET else
                          0.5 if c["status"] == NEEDS_INFO else 0.25,
            "reason": c["detail"],
        }
        for c in criteria
    ]

    return {
        "scheme_id": scheme_id,
        "scheme_name": scheme_name,
        "eligible": eligible,
        "status": status,
        "eligibility_status": eligibility_status,
        "eligibility_score": score,
        "criteria": criteria,
        "checks": criteria,  # Compatibility with frontend versions expecting checks.
        "passed_criteria": passed_criteria,
        "failed_criteria": failed_criteria,
        "missing_criteria": missing_criteria,
        "passed_criteria_names": passed_names,
        "failed_criteria_names": failed_names,
        "missing_criteria_names": missing_names,
        "missing_information": missing_names,
        "summary": summary,
        "message": message,
        "explanation": explanation,
        "xai_explanation": explanation,
        "xai_explanation_eligible": (
            "The evaluated criteria were met using verified scheme data."
            if eligible is True else ""
        ),
        "xai_explanation_not_eligible": (
            "The following verified criteria were not met: " + ", ".join(failed_names)
            if eligible is False else ""
        ),
        "feature_importance": feature_importance,
        "verification_pending": verification_pending,
        "verification_status": verification_status or "unknown",
    }


def run_scheme_eligibility(profile: Any, scheme_id: str) -> dict[str, Any]:
    """Compatibility helper for routers that pass a profile and scheme ID."""
    try:
        from services.scheme_service import get_scheme_by_id
    except ImportError:
        from backend.services.scheme_service import get_scheme_by_id

    scheme = get_scheme_by_id(str(scheme_id))
    return evaluate_scheme(profile, scheme)


def format_eligibility_response(result: dict[str, Any]) -> dict[str, Any]:
    """Keep all explainability fields while normalizing common response keys."""
    if not isinstance(result, dict):
        result = {}

    return {
        **result,
        "eligible": result.get("eligible"),
        "status": result.get("status", "needs_information"),
        "eligibility_status": result.get("eligibility_status", "needs information"),
        "eligibility_score": result.get("eligibility_score"),
        "criteria": result.get("criteria", []),
        "checks": result.get("checks", result.get("criteria", [])),
        "explanation": result.get("explanation", ""),
        "xai_explanation": result.get("xai_explanation", result.get("explanation", "")),
        "feature_importance": result.get("feature_importance", []),
    }
