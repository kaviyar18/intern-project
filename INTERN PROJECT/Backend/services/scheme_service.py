
"""
Scheme Service
AI-Powered Government Scholarship & Welfare Navigator

Responsibilities:
- Load government schemes from a CSV dataset.
- Retrieve schemes by ID.
- Search and filter scheme records.
- Provide consistent data to eligibility and recommendation services.
"""

import csv
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional


# Resolve the backend directory independently of the working directory.
BACKEND_DIR = Path(__file__).resolve().parents[1]

# Optional override:
# Windows PowerShell:
# $env:SCHEMES_CSV_PATH = "C:\\path\\to\\schemes.csv"
DEFAULT_CSV_PATHS = [
    BACKEND_DIR / "data" / "schemes.csv",
    BACKEND_DIR / "data" / "government_schemes.csv",
    BACKEND_DIR / "datasets" / "schemes.csv",
    BACKEND_DIR / "schemes.csv",
    BACKEND_DIR.parent / "data" / "schemes.csv",
]

CSV_PATH = Path(
    os.getenv("SCHEMES_CSV_PATH", "").strip()
).expanduser() if os.getenv("SCHEMES_CSV_PATH", "").strip() else None


class SchemeDataError(Exception):
    """Raised when scheme data cannot be loaded reliably."""


def _resolve_csv_path() -> Path:
    """Find the configured scheme CSV file."""
    if CSV_PATH is not None:
        if CSV_PATH.is_file():
            return CSV_PATH
        raise SchemeDataError(
            f"Configured scheme CSV file was not found: {CSV_PATH}"
        )

    for candidate in DEFAULT_CSV_PATHS:
        if candidate.is_file():
            return candidate

    searched = "\n".join(str(path) for path in DEFAULT_CSV_PATHS)

    raise SchemeDataError(
        "Scheme CSV file was not found. Place it in one of the "
        "supported locations or set SCHEMES_CSV_PATH.\n"
        f"Checked locations:\n{searched}"
    )


def _normalise_key(value: Any) -> str:
    """Normalise a column name for flexible lookup."""
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def _parse_value(value: Any) -> Any:
    """Trim CSV values while preserving unknown and empty values."""
    if value is None:
        return None

    text = str(value).strip()

    if not text:
        return None

    if text.lower() in {"null", "none", "n/a", "na"}:
        return None

    return text


def _normalise_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Preserve source columns and add standard aliases."""
    result = {
        _normalise_key(key): _parse_value(value)
        for key, value in row.items()
        if key is not None
    }

    aliases = {
        "scheme_id": (
            "scheme_id",
            "id",
            "scheme_code",
        ),
        "scheme_name_official": (
            "scheme_name_official",
            "scheme_name",
            "name",
            "title",
        ),
        "official_url": (
            "official_url",
            "scheme_url",
            "application_url",
            "url",
        ),
        "income_limit_amount": (
            "income_limit_amount",
            "income_limit",
            "annual_income_limit",
        ),
        "education_levels": (
            "education_levels",
            "education_level",
            "eligible_education",
        ),
        "eligible_categories": (
            "eligible_categories",
            "category",
            "categories",
        ),
        "verification_status": (
            "verification_status",
            "verification",
        ),
    }

    for standard_name, candidates in aliases.items():
        if result.get(standard_name) is not None:
            continue

        for candidate in candidates:
            if result.get(candidate) is not None:
                result[standard_name] = result[candidate]
                break

    return result


@lru_cache(maxsize=1)
def _load_schemes_cached(csv_path: str, modified_time: float) -> tuple:
    """
    Load CSV records.

    The modification time is part of the cache key so the cache can be
    refreshed when the dataset changes.
    """
    path = Path(csv_path)
    schemes: List[Dict[str, Any]] = []

    try:
        with path.open(
            "r",
            encoding="utf-8-sig",
            newline="",
        ) as csv_file:
            reader = csv.DictReader(csv_file)

            if not reader.fieldnames:
                raise SchemeDataError(
                    f"The scheme CSV has no header row: {path}"
                )

            for line_number, row in enumerate(reader, start=2):
                if not row or not any(
                    str(value or "").strip()
                    for value in row.values()
                ):
                    continue

                scheme = _normalise_row(row)

                if not scheme.get("scheme_id"):
                    raise SchemeDataError(
                        f"Missing scheme_id at CSV line {line_number}."
                    )

                if not scheme.get("scheme_name_official"):
                    raise SchemeDataError(
                        "Missing scheme name at CSV line "
                        f"{line_number}."
                    )

                schemes.append(scheme)

    except UnicodeDecodeError as exc:
        raise SchemeDataError(
            f"Could not decode scheme CSV file: {path}"
        ) from exc
    except OSError as exc:
        raise SchemeDataError(
            f"Could not read scheme CSV file: {path}"
        ) from exc

    if not schemes:
        raise SchemeDataError(
            f"No scheme records were found in: {path}"
        )

    # Return immutable cache storage; callers receive copies.
    return tuple(schemes)


def load_schemes(refresh: bool = False) -> List[Dict[str, Any]]:
    """Load all scheme records from the CSV dataset."""
    path = _resolve_csv_path()

    try:
        modified_time = path.stat().st_mtime
    except OSError as exc:
        raise SchemeDataError(
            f"Could not access scheme CSV file: {path}"
        ) from exc

    if refresh:
        _load_schemes_cached.cache_clear()

    records = _load_schemes_cached(
        str(path.resolve()),
        modified_time,
    )

    return [dict(record) for record in records]


def get_all_schemes() -> List[Dict[str, Any]]:
    """Return all available schemes."""
    return load_schemes()


def get_scheme_by_id(scheme_id: str) -> Optional[Dict[str, Any]]:
    """Find one scheme using its identifier."""
    if scheme_id is None:
        return None

    requested_id = str(scheme_id).strip().casefold()

    for scheme in get_all_schemes():
        current_id = str(
            scheme.get("scheme_id", "")
        ).strip().casefold()

        if current_id == requested_id:
            return scheme

    return None


def search_schemes(
    query: Optional[str] = None,
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Search scheme names, descriptions, categories, and metadata."""
    try:
        result_limit = max(1, min(int(limit), 500))
    except (TypeError, ValueError):
        result_limit = 50

    schemes = get_all_schemes()
    query_text = str(query or "").strip().casefold()

    if query_text:
        search_fields = (
            "scheme_id",
            "scheme_name_official",
            "description",
            "objective",
            "benefits",
            "education_levels",
            "eligible_categories",
            "gender_criteria",
            "disability_criteria",
            "domicile_criteria",
            "other_eligibility_criteria",
        )

        schemes = [
            scheme
            for scheme in schemes
            if any(
                query_text in str(scheme.get(field) or "").casefold()
                for field in search_fields
            )
        ]

    if filters:
        for field, requested in filters.items():
            if requested in (None, "", [], ()):
                continue

            if isinstance(requested, (list, tuple, set)):
                requested_values = [
                    str(value).strip().casefold()
                    for value in requested
                ]
            else:
                requested_values = [
                    str(requested).strip().casefold()
                ]

            def matches(scheme: Dict[str, Any]) -> bool:
                actual = scheme.get(_normalise_key(field))

                # Unknown metadata is not treated as a confirmed match.
                if actual is None:
                    return False

                actual_values = (
                    actual
                    if isinstance(actual, (list, tuple, set))
                    else [actual]
                )

                actual_text = [
                    str(value).strip().casefold()
                    for value in actual_values
                ]

                return any(
                    requested_value == actual_value
                    or requested_value in actual_value
                    for requested_value in requested_values
                    for actual_value in actual_text
                )

            schemes = [scheme for scheme in schemes if matches(scheme)]

    return schemes[:result_limit]


def get_scheme_filters() -> Dict[str, List[str]]:
    """Return distinct values useful for frontend filter controls."""
    fields = {
        "education_levels": "education_levels",
        "eligible_categories": "eligible_categories",
        "gender_criteria": "gender_criteria",
        "disability_criteria": "disability_criteria",
        "domicile_criteria": "domicile_criteria",
    }

    schemes = get_all_schemes()
    output: Dict[str, List[str]] = {}

    for output_key, source_key in fields.items():
        values = set()

        for scheme in schemes:
            value = scheme.get(source_key)

            if value is None:
                continue

            for item in str(value).split(";"):
                item = item.strip()

                if item:
                    values.add(item)

        output[output_key] = sorted(
            values,
            key=str.casefold,
        )

    return output


def clear_scheme_cache() -> None:
    """Clear cached CSV records after replacing the dataset."""
    _load_schemes_cached.cache_clear()


# Backward-compatible helper names for existing imports.
def get_scheme(scheme_id: str) -> Optional[Dict[str, Any]]:
    return get_scheme_by_id(scheme_id)


def find_schemes(
    query: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    return search_schemes(query=query, limit=limit)
