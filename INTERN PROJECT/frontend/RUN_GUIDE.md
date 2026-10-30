# AI-Powered Government Scholarship & Welfare Navigator

## 1. Configure Gemini (required for real LLM execution)

Open `backend/.env` and paste the Gemini API key you created:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=PASTE_YOUR_REAL_GEMINI_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash-lite
```

Do not commit or share the key.

## 2. Backend

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload
```

Verify:

- http://localhost:8000/health
- http://localhost:8000/docs

The health endpoint reports `llm_configured: true` when the Gemini key is loaded.

## 3. Frontend

Open a second terminal:

```powershell
npm install
npm run dev
```

Open http://localhost:5173.

A live status indicator in the top bar shows whether the backend and LLM configuration are available.

## 4. End-to-end flow

Voice / document
→ language detection and text extraction
→ Gemini LLM profile extraction
→ deterministic validation/fallback
→ scheme dataset matching
→ eligibility engine
→ XAI explanation
→ hybrid RAG (BM25 + TF-IDF)
→ Gemini grounded answer
→ application form
→ document upload
→ application ID
→ tracking

## 5. RAG knowledge base

The RAG index combines:

- `backend/data/schemes.csv`
- permitted government PDF/TXT files placed in `backend/data/documents/`

Long documents are chunked with overlap. Retrieval combines BM25 and TF-IDF scores. Only retrieved context is supplied to the LLM, and the prompt instructs it not to invent facts.

## 6. OCR

Typed PDFs use PyMuPDF.

Scanned PDFs/images use Tesseract if installed.

For Windows, set:

```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
TESSERACT_LANG=eng
```

Additional Tesseract language packs can be configured with `TESSERACT_LANG`.

## 7. Important project rule

The application never treats an API key being present as proof that an LLM call succeeded. `llm_used` becomes `true` only after a successful LLM response.

The deterministic extraction, eligibility engine, and retrieval fallback keep the application testable if the external LLM is temporarily unavailable.


## 8. Real-world application boundary

The Navigator creates and tracks its own internal application record. It does not invent a government application number or claim that a government submission happened. For schemes with a verified official route, the application page provides an official-portal handoff. Complete OTP/password/CAPTCHA authentication and final submission only on that official portal.

The frontend can store a government-generated reference number after the user submits externally. Live government status requires an official status API; otherwise the Track page links back to the official provider.
