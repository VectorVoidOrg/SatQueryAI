# backend/run_backend.py
import os
import uvicorn

if __name__ == "__main__":
    if os.environ.get("MODEL_BACKEND_URL"):
        print("[SatQuery AI] Launching lightweight relay; model remains remote.", flush=True)
        uvicorn.run("remote_proxy:app", host="0.0.0.0", port=8000, log_level="info", reload=False)
    else:
        print("[SatQuery AI] Launching Real GPU FastAPI Backend on http://127.0.0.1:8000...", flush=True)
        uvicorn.run("app:app", host="0.0.0.0", port=8000, log_level="info", reload=False)
