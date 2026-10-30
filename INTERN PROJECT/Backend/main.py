
"""
Main FastAPI Application
AI-Powered Government Scholarship & Welfare Navigator
"""

import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import (
    application,
    assistant,
    documents,
    eligibility,
    extraction,
    profile,
    recommendations,
    rag,
    schemes,
)

# ---------------------------------------------------------
# LOGGING
# ---------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# FASTAPI APPLICATION
# ---------------------------------------------------------

app = FastAPI(
    title="AI-Powered Government Scholarship & Welfare Navigator",
    description=(
        "A multilingual platform for discovering government "
        "scholarships and welfare schemes, assessing eligibility, "
        "processing documents, and providing application guidance."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------
# CORS CONFIGURATION
# Supports Vite ports 5173 and 5174.
# Also supports localhost and 127.0.0.1.
# ---------------------------------------------------------

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

configured_origins = os.getenv("FRONTEND_ORIGINS", "").strip()

if configured_origins:
    # If FRONTEND_ORIGINS is configured, use those origins
    # and include the standard local development origins.
    allowed_origins = default_origins + [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
else:
    allowed_origins = default_origins

# Remove duplicates while preserving order.
allowed_origins = list(dict.fromkeys(allowed_origins))

logger.info("CORS allowed origins: %s", allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

# ---------------------------------------------------------
# ROOT AND HEALTH ENDPOINTS
# ---------------------------------------------------------

@app.get("/")
async def root():
    return {
        "status": "running",
        "message": "Welfare Navigator API is running.",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "welfare-navigator-api",
    }


# ---------------------------------------------------------
# REGISTER EXISTING ROUTERS
# Keep the prefixes defined inside each router unchanged.
# ---------------------------------------------------------

app.include_router(
    profile.router,
    tags=["Profile"],
)

app.include_router(
    schemes.router,
    tags=["Schemes"],
)

app.include_router(
    recommendations.router,
    tags=["Recommendations"],
)

app.include_router(
    eligibility.router,
    tags=["Eligibility"],
)

app.include_router(
    application.router,
    tags=["Applications"],
)

app.include_router(
    documents.router,
    tags=["Documents"],
)

app.include_router(
    assistant.router,
    tags=["Assistant"],
)

app.include_router(
    extraction.router,
    tags=["Extraction"],
)

app.include_router(
    rag.router,
    tags=["RAG"],
)

# ---------------------------------------------------------
# NOT FOUND HANDLER
# ---------------------------------------------------------

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "detail": (
                "Endpoint not found. Check the API path "
                "and available routes at /docs."
            )
        },
    )


# ---------------------------------------------------------
# APPLICATION ENTRY POINT
# ---------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
