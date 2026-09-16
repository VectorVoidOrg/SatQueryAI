# backend/run_backend.py
import sys
import uvicorn

if __name__ == "__main__":
    print("[SatQuery AI] Launching FastAPI Backend on http://127.0.0.1:8000...", flush=True)
    uvicorn.run("app:app", host="0.0.0.0", port=8000, log_level="info", reload=False)
