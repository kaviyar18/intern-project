LANGUAGE_MAP = {
    "en": "English", "as": "Assamese", "bn": "Bengali", "brx": "Bodo",
    "doi": "Dogri", "gu": "Gujarati", "hi": "Hindi", "kn": "Kannada",
    "ks": "Kashmiri", "kok": "Konkani", "mai": "Maithili", "ml": "Malayalam",
    "mni": "Manipuri", "mr": "Marathi", "ne": "Nepali", "or": "Odia",
    "pa": "Punjabi", "sa": "Sanskrit", "sat": "Santali", "sd": "Sindhi",
    "ta": "Tamil", "te": "Telugu", "ur": "Urdu",
}

# Script-level detection is deterministic; the user-selected language is passed
# separately to the LLM for reliable generation in the requested language.
UNICODE_RANGES = {
    "hi": (0x0900, 0x097F),
    "bn": (0x0980, 0x09FF),
    "gu": (0x0A80, 0x0AFF),
    "pa": (0x0A00, 0x0A7F),
    "ta": (0x0B80, 0x0BFF),
    "te": (0x0C00, 0x0C7F),
    "kn": (0x0C80, 0x0CFF),
    "ml": (0x0D00, 0x0D7F),
    "or": (0x0B00, 0x0B7F),
    "sat": (0x1C50, 0x1C7F),
    "ur": (0x0600, 0x06FF),
}


def detect_language(text: str) -> str:
    if not text:
        return "en"
    counts = {}
    for char in text:
        cp = ord(char)
        for lang, (lo, hi) in UNICODE_RANGES.items():
            if lo <= cp <= hi:
                counts[lang] = counts.get(lang, 0) + 1
                break
    if not counts:
        return "en"
    return max(counts, key=counts.get)


def get_language_name(code: str) -> str:
    return LANGUAGE_MAP.get(code, "English")
