from typing import Optional, Any

from pydantic import BaseModel, Field, ConfigDict


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1)
    language: Optional[str] = None


class VoiceRequest(BaseModel):
    transcript: str = Field(..., min_length=1)
    language: Optional[str] = None


class CandidateProfile(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=1, le=120)

    gender: Optional[str] = None
    state: Optional[str] = None

    education: Optional[str] = None
    education_level: Optional[str] = None

    # Income amount in INR; eligibility rules are evaluated elsewhere.
    income: Optional[int] = Field(default=None, ge=0)

    category: Optional[str] = None

    # None = unknown, True = has a disability, False = explicitly no disability.
    disability: Optional[bool] = None

    disability_percentage: Optional[int] = Field(
        default=None,
        ge=0,
        le=100,
    )

    academic_details: Optional[dict[str, Any]] = None


class ExtractionResponse(BaseModel):
    success: bool
    language: str
    language_name: str
    profile: CandidateProfile
    raw_text: str
    extraction_method: str
    llm_used: bool = False