
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from services.scheme_service import get_scheme_by_id
from services.rag_service import answer


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["rag"],
)


class RagRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    question: str = Field(..., min_length=1, max_length=5000)
    scheme_id: str = Field(..., min_length=1, max_length=200)
    language: str = Field(default="en", min_length=1, max_length=50)


class RagResponse(BaseModel):
    answer: str
    sources: list[str]
    retrieval_method: str
    llm_used: bool


@router.post("/rag", response_model=RagResponse)
async def rag_answer(request: RagRequest):
    question = request.question.strip()
    scheme_id = request.scheme_id.strip()
    language = request.language.strip() or "en"

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question is empty.",
        )

    if not scheme_id:
        raise HTTPException(
            status_code=400,
            detail="Scheme ID is required.",
        )

    try:
        scheme = get_scheme_by_id(scheme_id)
    except Exception as exc:
        logger.exception("Failed to retrieve scheme %s.", scheme_id)
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve the selected scheme.",
        ) from exc

    if not scheme:
        raise HTTPException(
            status_code=404,
            detail="Scheme not found.",
        )

    try:
        result = answer(
            question,
            scheme_id,
            language,
        )
    except Exception as exc:
        logger.exception("RAG answer generation failed for %s.", scheme_id)
        raise HTTPException(
            status_code=500,
            detail="Unable to generate an answer for this scheme.",
        ) from exc

    if not isinstance(result, dict):
        raise HTTPException(
            status_code=500,
            detail="The RAG service returned an invalid response.",
        )

    # Normalize the response to the existing frontend contract.
    return {
        "answer": str(result.get("answer") or ""),
        "sources": [
            str(source)
            for source in (result.get("sources") or [])
            if source
        ],
        "retrieval_method": str(
            result.get("retrieval_method") or "unknown"
        ),
        "llm_used": result.get("llm_used") is True,
    }
