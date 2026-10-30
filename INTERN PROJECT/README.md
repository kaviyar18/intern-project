# INTERN PROJECT

AI-Powered Government Scholarship & Welfare Navigator for Indian Citizens Using Multilingual AI, LLM, RAG and Explainable AI.

## Structure

- `backend/` - existing FastAPI backend and core implementation. No backend flow was changed.
- `frontend/` - React/Vite UI redesigned to match the supplied 8-screen reference image.
- `START_PROJECT.bat` - starts both services on Windows.

## UI flow preserved

Home -> Profile Input -> Candidate Profile -> Recommendations -> Eligibility Check -> Application -> Submission -> Track Application

AI Chatbot remains available from the sidebar.

## Run

### Option 1
Double-click `START_PROJECT.bat`.

### Option 2
Backend:
```powershell
cd backend
python -m venv .venv
.venv\Scriptsctivate
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend in a second terminal:
```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

Backend docs: http://localhost:8000/docs

## API
The existing frontend API client and FastAPI endpoints are retained. The UI calls the existing processing, recommendation, eligibility, RAG, application, upload, tracking, chat, and health endpoints.

## LLM/OCR
Edit `backend/.env` and add the existing project's Gemini API key if LLM generation is required. Tesseract configuration remains in the backend environment.
