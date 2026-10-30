
"""
AI Assistant / Chatbot Router
Project: AI-Powered Government Scholarship & Welfare Navigator

Endpoint:
    POST /api/assistant/chat
    POST /api/assistant

This router delegates responses to assistant_service.py.
It does not require authentication.
"""

from __future__ import annotations

import inspect
import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

try:
    from services import assistant_service
except ImportError:
    from backend.services import assistant_service


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/assistant",
    tags=["AI Assistant"],
)


# ---------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------

class AssistantRequest(BaseModel):
    """Flexible request model for existing chatbot clients."""

    model_config = ConfigDict(extra="allow")

    message: Optional[str] = None
    query: Optional[str] = None
    text: Optional[str] = None
    language: Optional[str] = "en"
    profile: dict[str, Any] = Field(default_factory=dict)
    conversation_history: list[dict[str, Any]] = Field(default_factory=list)
    history: list[dict[str, Any]] = Field(default_factory=list)


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

    return {}


def _get_message(payload: AssistantRequest) -> str:
    data = payload.model_dump(exclude_none=True)

    for key in ("message", "query", "text", "prompt"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return ""


def _get_history(payload: AssistantRequest) -> list[dict[str, Any]]:
    data = payload.model_dump(exclude_none=True)

    history = data.get("conversation_history")
    if isinstance(history, list) and history:
        return history

    history = data.get("history")
    return history if isinstance(history, list) else []


def _normalise_result(result: Any, language: str) -> dict[str, Any]:
    """
    Normalize service output without assuming that every assistant
    implementation returns the same response shape.
    """
    if isinstance(result, str):
        answer = result
        return {
            "success": True,
            "response": answer,
            "answer": answer,
            "message": answer,
            "language": language,
        }

    data = _to_dict(result)

    if not data:
        answer = str(result) if result is not None else (
            "I could not generate a response. Please try again."
        )
        return {
            "success": True,
            "response": answer,
            "answer": answer,
            "message": answer,
            "language": language,
        }

    answer = (
        data.get("response")
        or data.get("answer")
        or data.get("reply")
        or data.get("message")
        or data.get("content")
        or ""
    )

    # Keep original service fields so existing UI integrations can use
    # additional metadata, sources, or retrieval details.
    return {
        **data,
        "success": data.get("success", True),
        "response": answer,
        "answer": answer,
        "message": answer,
        "language": data.get("language") or language,
    }


async def _call_assistant_service(
    message: str,
    *,
    language: str,
    profile: dict[str, Any],
    history: list[dict[str, Any]],
) -> Any:
    """
    Call an available assistant_service function.

    Function names are checked dynamically to support common service
    naming conventions. Inspect the existing service before relying on
    any particular function signature.
    """
    candidate_names = (
        "chat",
        "chat_with_assistant",
        "get_assistant_response",
        "generate_response",
        "process_message",
        "answer_question",
    )

    function = None

    for name in candidate_names:
        candidate = getattr(assistant_service, name, None)
        if callable(candidate):
            function = candidate
            break

    if function is None:
        raise HTTPException(
            status_code=501,
            detail=(
                "No supported chat function was found in "
                "services/assistant_service.py."
            ),
        )

    # Pass only parameters accepted by the actual service function.
    available_values = {
        "message": message,
        "query": message,
        "text": message,
        "prompt": message,
        "language": language,
        "profile": profile,
        "user_profile": profile,
        "conversation_history": history,
        "history": history,
        "context": profile,
    }

    try:
        signature = inspect.signature(function)
        parameters = signature.parameters

        accepts_kwargs = any(
            parameter.kind == inspect.Parameter.VAR_KEYWORD
            for parameter in parameters.values()
        )

        if accepts_kwargs:
            kwargs = {
                "message": message,
                "language": language,
                "profile": profile,
                "history": history,
            }
        else:
            kwargs = {
                name: available_values[name]
                for name, parameter in parameters.items()
                if name in available_values
                and parameter.kind
                in (
                    inspect.Parameter.POSITIONAL_OR_KEYWORD,
                    inspect.Parameter.KEYWORD_ONLY,
                )
            }

        if kwargs:
            result = function(**kwargs)
        else:
            result = function(message)

        if inspect.isawaitable(result):
            result = await result

        return result

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Assistant service call failed")
        raise HTTPException(
            status_code=500,
            detail="The assistant could not process this message.",
        ) from exc


# ---------------------------------------------------------------------
# POST /api/assistant/chat
# ---------------------------------------------------------------------

@router.post("/chat")
async def chat_with_assistant(payload: AssistantRequest):
    """Handle a chatbot message."""
    message = _get_message(payload)

    if not message:
        raise HTTPException(
            status_code=422,
            detail="A non-empty message is required.",
        )

    language = (payload.language or "en").strip().lower()
    profile = payload.profile or {}
    history = _get_history(payload)

    try:
        result = await _call_assistant_service(
            message,
            language=language,
            profile=profile,
            history=history,
        )

        response = _normalise_result(result, language)
        response.setdefault("user_message", message)

        return response

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Chat endpoint failed")
        raise HTTPException(
            status_code=500,
            detail="The chatbot request failed. Check backend logs.",
        ) from exc


# ---------------------------------------------------------------------
# POST /api/assistant
# Compatibility endpoint for clients using the router root.
# ---------------------------------------------------------------------

@router.post("")
@router.post("/")
async def chat_compatibility(payload: AssistantRequest):
    """Compatibility alias for POST /api/assistant/chat."""
    return await chat_with_assistant(payload)
