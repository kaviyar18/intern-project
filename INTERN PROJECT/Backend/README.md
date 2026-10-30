# Welfare Navigator Backend

FastAPI backend for the AI-Powered Government Scholarship & Welfare Navigator.

## Included modules
- Profile storage (in-memory; resets when the server restarts)
- Scheme catalogue loaded from `data/schemes.csv`
- Eligibility assessment with explainability fields
- Scheme recommendations
- Text, voice-transcript and document extraction
- Document upload/extraction helpers
- Assistant/chat endpoints
- Hybrid RAG: BM25 + TF-IDF + multilingual ChromaDB embeddings
- Application creation, listing, status updates and lookup

## Setup (Windows PowerShell)
```powershell
cd path\to\Welfare_Navigator_Backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```
Edit `.env` and add a valid `GEMINI_API_KEY` (default provider) or set `LLM_PROVIDER=openai` and add `OPENAI_API_KEY`.

Run the API:
```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Open `http://127.0.0.1:8000/docs` for interactive API documentation and `http://127.0.0.1:8000/health` for health status.

## Frontend connection
Set the frontend API base to `http://localhost:8000/api`. The voice endpoint expects JSON with a non-empty `transcript` field, for example `{"transcript":"I am a college student from Tamil Nadu","language":"en"}`. This endpoint processes an already-captured transcript; it does not itself record microphone audio or perform speech-to-text.

## OCR
Scanned/image-based files may require Tesseract OCR installed separately on Windows and available on PATH. Typed PDFs are handled with direct text extraction where possible.

## Notes and limitations
- No authentication is configured, consistent with the open-platform design.
- Profile and application records are currently held in process memory by these uploaded modules; they are not durable across restarts and are not shared across multiple workers.
- Semantic RAG may download the multilingual SentenceTransformer model the first time it runs. If that fails, the RAG service falls back to lexical retrieval.
- Do not treat dataset entries as official eligibility decisions; verify requirements and deadlines at official sources.
