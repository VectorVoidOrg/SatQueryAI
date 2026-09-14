# SatQuery AI Project Memory & Context Rule

## Active System Context
- **Project:** SatQuery AI (Remote Sensing VLM & Bi-temporal Change Detection System)
- **Backend:** FastAPI running on NVIDIA GPU with `Qwen/Qwen2.5-VL-3B-Instruct` (4-bit NF4) + LoRA `adapter_a` (VQA/Caption) and `adapter_b` (Change Detection).
- **Frontend:** Next.js 14 Web UI connected live to `http://localhost:8000` with 0 mock data.
- **Verification:** 13 unit test suites (775 checks) and 3 backend test suites (223 checks) passing 100%. Live GPU benchmark verified.

## Key Rules & Invariants
1. **No Mock Data:** The frontend must never revert to canned/mock responses. All responses must flow from the backend API.
2. **Honesty Invariants:** Confidence values must state non-calibrated disclaimer; `AGREE`/`DISAGREE`/`WITHHELD` status must strictly follow spatial differencing cross-checks.
3. **Primary Backend Launcher:** Use `backend/run_backend.py` or `python -m uvicorn app:app` inside `backend/` for GPU execution.
