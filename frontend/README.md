# SatQuery AI — Next.js Frontend

The agentic operator UI for **SatQuery AI** (SIH 26167).

## Architecture & Integration

- **Zero Mock Layer**: All requests proxy directly to the FastAPI backend (`POST /analyze`).
- **Server-Side Proxy Routes**: Next.js App Router API handlers (`app/api/analyze/route.ts`, `app/api/report/[id]/route.ts`) forward multipart FormData requests directly to `${BACKEND_URL}`.
- **Auditable Visual Evidence**: Displays rendered change overlays, bounding box regions, model-vs-pixel agreement cross-checks, and downloadable per-analysis report records.

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Run dev server (defaults to pointing at http://127.0.0.1:8000)
npm run dev

# Or set custom backend URL (e.g., Kaggle Cloudflare Tunnel)
BACKEND_URL=https://your-tunnel.trycloudflare.com npm run dev
```

## Production Build

```bash
npm run build
```
