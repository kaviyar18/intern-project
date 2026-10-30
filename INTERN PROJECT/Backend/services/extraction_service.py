import re
import logging
from typing import Optional, Dict, Any, Tuple

from models.schemas import CandidateProfile
from services.llm_service import extract_profile_with_llm


logger = logging.getLogger(__name__)


# ============================================================
# INDIAN STATES AND UNION TERRITORIES
# ============================================================

INDIAN_STATES = [
    "andhra pradesh",
    "arunachal pradesh",
    "assam",
    "bihar",
    "chhattisgarh",
    "goa",
    "gujarat",
    "haryana",
    "himachal pradesh",
    "jharkhand",
    "karnataka",
    "kerala",
    "madhya pradesh",
    "maharashtra",
    "manipur",
    "meghalaya",
    "mizoram",
    "nagaland",
    "odisha",
    "punjab",
    "rajasthan",
    "sikkim",
    "tamil nadu",
    "telangana",
    "tripura",
    "uttar pradesh",
    "uttarakhand",
    "west bengal",
    "andaman and nicobar islands",
    "andaman and nicobar",
    "dadra and nagar haveli and daman and diu",
    "dadra and nagar haveli",
    "daman and diu",
    "jammu and kashmir",
    "jammu",
    "kashmir",
    "ladakh",
    "chandigarh",
    "delhi",
    "puducherry",
    "lakshadweep",
]


# ============================================================
# EDUCATION KEYWORDS
# ============================================================

EDUCATION_KEYWORDS = {
    "PhD": [
        "ph.d.",
        "ph.d",
        "phd",
        "doctorate",
        "doctoral",
        "research scholar",
        "research fellow",
    ],
    "PG": [
        "postgraduate",
        "post-graduate",
        "m.tech",
        "mtech",
        "m.e.",
        "mba",
        "mca",
        "m.sc",
        "msc",
        "m.a.",
        "ma degree",
        "m.com",
        "master's",
        "masters",
        "master degree",
    ],
    "UG": [
        "undergraduate",
        "under-graduate",
        "b.tech",
        "btech",
        "b.e.",
        "b.sc",
        "bsc",
        "b.a.",
        "b.com",
        "bca",
        "bachelor's",
        "bachelors",
        "bachelor degree",
    ],
    "Class 12": [
        "class 12",
        "class xii",
        "12th standard",
        "12th class",
        "12th grade",
        "higher secondary",
        "hsc",
        "intermediate",
        "pre-university",
        "plus two",
    ],
    "Class 10": [
        "class 10",
        "class x",
        "10th standard",
        "10th class",
        "10th grade",
        "secondary school",
        "ssc",
        "matriculation",
        "matric",
    ],
    "Class 8": [
        "class 8",
        "class viii",
        "8th standard",
        "8th class",
        "eighth standard",
    ],
    "Pre-Matric": [
        "pre-matric",
        "pre matric",
        "below class 10",
        "below 10th",
    ],
}


CATEGORY_KEYWORDS = {
    "SC": [
        "scheduled caste",
        "sc",
    ],
    "ST": [
        "scheduled tribe",
        "st",
    ],
    "OBC": [
        "other backward class",
        "other backward classes",
        "obc",
    ],
    "EWS": [
        "economically weaker section",
        "economically weaker sections",
        "ews",
    ],
    "General": [
        "general category",
        "general caste",
    ],
}


LAST_LLM_USED = False


# ============================================================
# GENERAL HELPERS
# ============================================================

def _to_title_case(value: str) -> str:
    """Convert a location string into readable title case."""
    return " ".join(word.capitalize() for word in value.split())


def _has_phrase(text: str, phrase: str) -> bool:
    """Check a phrase without matching it inside unrelated words."""
    pattern = r"(?<!\w)" + re.escape(phrase) + r"(?!\w)"
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def _first_present(
    primary: Any,
    fallback: Any,
) -> Any:
    """
    Preserve valid values from the LLM.
    Use deterministic extraction only when the LLM value is missing.
    """
    if primary is None:
        return fallback

    if isinstance(primary, str) and not primary.strip():
        return fallback

    return primary


# ============================================================
# STATE EXTRACTION
# ============================================================

def _find_state(text_lower: str) -> Optional[str]:
    # Match longer names before shorter names.
    for state in sorted(INDIAN_STATES, key=len, reverse=True):
        if _has_phrase(text_lower, state):
            return _to_title_case(state)

    return None


# ============================================================
# EDUCATION EXTRACTION
# ============================================================

def _find_education(
    text_lower: str,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Return (education_description, education_level).

    The current CandidateProfile representation uses the same
    standardized label for both values when no detailed course
    description is available.
    """
    for level, keywords in EDUCATION_KEYWORDS.items():
        for keyword in keywords:
            if _has_phrase(text_lower, keyword):
                return level, level

    # Generic descriptions that should not be confused with a
    # specific degree or school level.
    if _has_phrase(text_lower, "school student"):
        return "School student", "Any"

    if _has_phrase(text_lower, "college student"):
        return "College student", "Any"

    return None, None


# ============================================================
# CATEGORY EXTRACTION
# ============================================================

def _find_category(text_lower: str) -> Optional[str]:
    # Prefer specific, multi-word category descriptions.
    ordered_categories = [
        ("SC", ["scheduled caste"]),
        ("ST", ["scheduled tribe"]),
        ("OBC", [
            "other backward class",
            "other backward classes",
        ]),
        ("EWS", [
            "economically weaker section",
            "economically weaker sections",
        ]),
        ("SC", ["sc"]),
        ("ST", ["st"]),
        ("OBC", ["obc"]),
        ("EWS", ["ews"]),
        ("General", ["general category", "general caste"]),
    ]

    for category, phrases in ordered_categories:
        for phrase in phrases:
            if _has_phrase(text_lower, phrase):
                return category

    return None


# ============================================================
# INCOME EXTRACTION
# ============================================================

def _find_income(
    text: str,
    text_lower: str,
) -> Optional[int]:
    """
    Extract an income amount in INR.

    Supported examples:
      - annual income 180000
      - family income is 1,80,000
      - income ₹2 lakh
      - annual family income 1 lakh 80 thousand
      - 2.5 lakh per year

    Returns an integer amount, or None if no reliable amount
    can be extracted.
    """

    # Indian shorthand: 1 lakh 80 thousand.
    match = re.search(
        r"\b(\d+(?:\.\d+)?)\s*lakhs?"
        r"(?:\s*(\d+(?:\.\d+)?)\s*thousand)?\b",
        text_lower,
    )

    if match:
        lakhs = float(match.group(1))
        thousands = float(match.group(2) or 0)

        amount = int(lakhs * 100000 + thousands * 1000)

        if amount >= 0:
            return amount

    # Indian shorthand: 2.5 lakh, 3 lakhs, etc.
    match = re.search(
        r"\b(\d+(?:\.\d+)?)\s*(?:lakh|lakhs)\b",
        text_lower,
    )

    if match:
        return int(float(match.group(1)) * 100000)

    # Shorthand: 50 thousand.
    match = re.search(
        r"\b(\d+(?:\.\d+)?)\s*thousand\b",
        text_lower,
    )

    if match:
        return int(float(match.group(1)) * 1000)

    # Extract an amount near an income-related label.
    amount_pattern = r"(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)"

    income_patterns = [
        r"\bannual\s+family\s+income\b\s*(?:is|of|:|=|-)?\s*" + amount_pattern,
        r"\bfamily\s+income\b\s*(?:is|of|:|=|-)?\s*" + amount_pattern,
        r"\bannual\s+income\b\s*(?:is|of|:|=|-)?\s*" + amount_pattern,
        r"\byearly\s+income\b\s*(?:is|of|:|=|-)?\s*" + amount_pattern,
        r"\bincome\b\s*(?:is|of|:|=|-)?\s*" + amount_pattern,
        r"(?:₹|rs\.?|inr)\s*(\d[\d,]*(?:\.\d+)?)",
    ]

    for pattern in income_patterns:
        match = re.search(pattern, text_lower, flags=re.IGNORECASE)

        if not match:
            continue

        try:
            raw_amount = match.group(1).replace(",", "")
            amount = float(raw_amount)

            if amount >= 0:
                return int(amount)

        except (ValueError, IndexError):
            continue

    # Standalone numeric amounts are deliberately not interpreted
    # as income because they might be age, marks, or another value.
    return None


# ============================================================
# AGE EXTRACTION
# ============================================================

def _find_age(text_lower: str) -> Optional[int]:
    patterns = [
        r"\bi\s+am\s+(\d{1,3})\s*(?:years?\s+old)?\b",
        r"\bmy\s+age\s*(?:is|:|=)?\s*(\d{1,3})\b",
        r"\bage\s*(?:is|:|=)?\s*(\d{1,3})\b",
        r"\b(\d{1,3})\s*(?:years?\s+old|yrs?\s+old)\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text_lower)

        if match:
            age = int(match.group(1))

            if 1 <= age <= 120:
                return age

    return None


# ============================================================
# NAME EXTRACTION
# ============================================================

def _find_name(
    text: str,
    text_lower: str,
) -> Optional[str]:
    patterns = [
        r"\bmy\s+name\s+is\s+([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){0,3})",
        r"\bname\s*[:=-]\s*([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){0,3})",
        r"\bi\s+am\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b",
        r"\b(?:hello|hi|namaste)[,!]?\s+"
        r"(?:my\s+name\s+is\s+)?"
        r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)

        if not match:
            continue

        candidate = match.group(1).strip()
        words = candidate.split()

        # Avoid returning obvious non-name words from generic
        # phrases such as "I am studying".
        invalid_starts = {
            "studying",
            "pursuing",
            "currently",
            "from",
            "eligible",
            "looking",
            "applying",
            "a",
            "an",
            "the",
        }

        if words and words[0].lower() in invalid_starts:
            continue

        return candidate

    return None


# ============================================================
# GENDER EXTRACTION
# ============================================================

def _find_gender(text_lower: str) -> Optional[str]:
    """
    Prefer explicit gender statements.

    Avoid inferring gender from ordinary pronouns such as
    'he', 'she', 'his', or 'her' because these can refer to
    someone other than the applicant.
    """

    patterns = [
        (r"\b(?:gender\s*[:=]\s*|i\s+am\s+|i\s+identify\s+as\s+)(male|female|non[- ]binary)\b",
         {"male": "Male", "female": "Female", "non-binary": "Non-binary",
          "non binary": "Non-binary"}),
        (r"\b(?:gender\s*[:=]\s*|i\s+am\s+)(man|woman)\b",
         {"man": "Male", "woman": "Female"}),
    ]

    for pattern, mapping in patterns:
        match = re.search(pattern, text_lower)

        if match:
            return mapping.get(match.group(1).lower())

    return None


# ============================================================
# DISABILITY EXTRACTION
# ============================================================

def _find_disability(
    text_lower: str,
) -> Tuple[Optional[bool], Optional[int]]:
    """
    Return (disability_status, disability_percentage).

    None means the status is unknown.
    False means the text explicitly indicates no disability.
    """

    disability_terms = [
        "disability",
        "disabled",
        "handicap",
        "handicapped",
        "differently abled",
        "person with disability",
        "person with disabilities",
        "wheelchair user",
        "blind",
        "deaf",
        "mute",
        "physically challenged",
        "locomotor disability",
        "visual impairment",
        "hearing impairment",
    ]

    has_disability_term = any(
        _has_phrase(text_lower, term)
        for term in disability_terms
    )

    negative_patterns = [
        r"\bno\s+(?:known\s+)?disability\b",
        r"\bwithout\s+(?:any\s+)?disability\b",
        r"\bdo\s+not\s+have\s+(?:any\s+)?disability\b",
        r"\bdon't\s+have\s+(?:any\s+)?disability\b",
        r"\bnot\s+disabled\b",
        r"\bno\s+disabilities\b",
    ]

    explicitly_no_disability = any(
        re.search(pattern, text_lower)
        for pattern in negative_patterns
    )

    if explicitly_no_disability:
        return False, None

    if not has_disability_term:
        return None, None

    percentage = None

    percentage_patterns = [
        r"\b(\d{1,3})\s*%\s*(?:disability|disabled|impairment)\b",
        r"\b(?:disability|impairment)\s*(?:of\s*)?(\d{1,3})\s*%\b",
        r"\b(\d{1,3})\s*%\s*(?:benchmark\s+)?disability\b",
    ]

    for pattern in percentage_patterns:
        match = re.search(pattern, text_lower)

        if match:
            value = int(match.group(1))

            if 0 <= value <= 100:
                percentage = value
                break

    return True, percentage


# ============================================================
# ACADEMIC DETAILS
# ============================================================

def _find_institution(
    text: str,
    text_lower: str,
) -> Optional[str]:
    patterns = [
        r"\b(?:studying|study|pursuing)\s+(?:at|in)\s+"
        r"([A-Z][A-Za-z0-9&.,'()\- ]{1,100}?)"
        r"(?=[,;\n.]|$)",

        r"\b(?:institution|college|university|school)\s*[:=-]\s*"
        r"([A-Z][A-Za-z0-9&.,'()\- ]{1,100}?)"
        r"(?=[,;\n.]|$)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)

        if match:
            institution = match.group(1).strip()

            if institution:
                return institution

    return None


def _find_year(text_lower: str) -> Optional[str]:
    patterns = [
        r"\b(\d{1,2}(?:st|nd|rd|th)\s+year)\b",
        r"\b(first|second|third|fourth|final)\s+year\b",
        r"\b(year\s*[:=]\s*\d{1,2})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text_lower)

        if match:
            return match.group(1)

    return None


def _find_gpa(
    text: str,
    text_lower: str,
) -> Optional[str]:
    patterns = [
        r"\b(?:gpa|cgpa|percentage|marks)\s*[:=-]?\s*(\d{1,3}(?:\.\d+)?)",
        r"\b(\d{1,2}(?:\.\d+)?)\s*(?:gpa|cgpa)\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text_lower)

        if match:
            value = match.group(1)

            try:
                numeric_value = float(value)

                # A basic sanity check, not a determination of merit.
                if 0 <= numeric_value <= 100:
                    return value

            except ValueError:
                continue

    return None


# ============================================================
# PROFILE EXTRACTION
# ============================================================

def extract_profile(
    text: str,
    language: str = "en",
) -> CandidateProfile:
    """
    Extract candidate information using the configured LLM and
    deterministic rules.

    LLM values are preferred when present. Deterministic rules
    fill missing fields. No eligibility decision is made here.
    """

    global LAST_LLM_USED

    if not isinstance(text, str) or not text.strip():
        LAST_LLM_USED = False
        return CandidateProfile()

    text_lower = text.lower()

    # --------------------------------------------------------
    # 1. Deterministic extraction
    # --------------------------------------------------------

    rule_name = _find_name(text, text_lower)
    rule_age = _find_age(text_lower)
    rule_state = _find_state(text_lower)

    rule_education, rule_education_level = _find_education(
        text_lower
    )

    rule_income = _find_income(text, text_lower)
    rule_category = _find_category(text_lower)
    rule_gender = _find_gender(text_lower)

    rule_disability, rule_disability_percentage = (
        _find_disability(text_lower)
    )

    rule_institution = _find_institution(text, text_lower)
    rule_year = _find_year(text_lower)
    rule_gpa = _find_gpa(text, text_lower)

    rule_academic_details = {}

    if rule_institution:
        rule_academic_details["institution"] = rule_institution

    if rule_year:
        rule_academic_details["year"] = rule_year

    if rule_gpa:
        rule_academic_details["gpa"] = rule_gpa

    # --------------------------------------------------------
    # 2. LLM extraction
    # --------------------------------------------------------

    llm_data = None
    LAST_LLM_USED = False

    try:
        llm_data, llm_success = extract_profile_with_llm(
            text,
            language,
        )

        LAST_LLM_USED = bool(llm_success and isinstance(llm_data, dict))

        if not isinstance(llm_data, dict):
            llm_data = {}

    except Exception:
        logger.exception("LLM profile extraction failed.")
        llm_data = {}
        LAST_LLM_USED = False

    # --------------------------------------------------------
    # 3. Merge academic details without discarding fields
    # --------------------------------------------------------

    llm_academic_details = llm_data.get("academic_details")

    if not isinstance(llm_academic_details, dict):
        llm_academic_details = {}

    academic_details = dict(rule_academic_details)

    for key, value in llm_academic_details.items():
        if value is not None and value != "":
            academic_details[key] = value

    # --------------------------------------------------------
    # 4. Build CandidateProfile
    # --------------------------------------------------------

    llm_disability = llm_data.get("disability")

    if isinstance(llm_disability, bool):
        disability = llm_disability
    else:
        disability = rule_disability

    llm_disability_percentage = llm_data.get(
        "disability_percentage"
    )

    if llm_disability_percentage is not None:
        disability_percentage = llm_disability_percentage
    else:
        disability_percentage = rule_disability_percentage

    profile_data: Dict[str, Any] = {
        "name": _first_present(
            llm_data.get("name"),
            rule_name,
        ),
        "age": _first_present(
            llm_data.get("age"),
            rule_age,
        ),
        "gender": _first_present(
            llm_data.get("gender"),
            rule_gender,
        ),
        "state": _first_present(
            llm_data.get("state"),
            rule_state,
        ),
        "education": _first_present(
            llm_data.get("education"),
            rule_education,
        ),
        "education_level": _first_present(
            llm_data.get("education_level"),
            rule_education_level,
        ),
        "income": _first_present(
            llm_data.get("income"),
            rule_income,
        ),
        "category": _first_present(
            llm_data.get("category"),
            rule_category,
        ),
        "disability": disability,
        "disability_percentage": disability_percentage,
        "academic_details": academic_details or None,
    }

    # Do not add fields that CandidateProfile does not define.
    # This keeps the extraction service compatible with the
    # existing Pydantic schema.
    try:
        return CandidateProfile(**profile_data)

    except Exception:
        logger.exception(
            "CandidateProfile validation failed after extraction."
        )
        raise


def llm_used_for_last_extraction() -> bool:
    """Whether the LLM returned a successful extraction last time."""
    return LAST_LLM_USED