import os
from typing import Any

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response

MODEL_BACKEND_URL = os.environ.get("MODEL_BACKEND_URL", "").rstrip("/")
app = FastAPI(title="SatQuery AI Lightweight Remote Relay")


async def forward(request: Request, path: str) -> Response:
    if not MODEL_BACKEND_URL:
        return Response(
            content='{"detail":"MODEL_BACKEND_URL is not configured."}',
            status_code=502,
            media_type="application/json",
        )

    body = await request.body()
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length"}
    }
    async with httpx.AsyncClient(timeout=None) as client:
        upstream = await client.request(
            request.method,
            f"{MODEL_BACKEND_URL}/{path.lstrip('/')}",
            content=body,
            headers=headers,
            params=request.query_params,
        )

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in {"content-length", "transfer-encoding", "connection"}
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )


@app.get("/health")
async def health() -> Response:
    if not MODEL_BACKEND_URL:
        return Response(
            content='{"detail":"MODEL_BACKEND_URL is not configured."}',
            status_code=502,
            media_type="application/json",
        )
    async with httpx.AsyncClient(timeout=None) as client:
        upstream = await client.get(f"{MODEL_BACKEND_URL}/health")
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers={"content-type": upstream.headers.get("content-type", "application/json")},
    )


@app.api_route("/analyze", methods=["POST"])
async def analyze(request: Request) -> Response:
    return await forward(request, "analyze")


@app.api_route("/report/{report_id}", methods=["GET"])
async def report(report_id: str, request: Request) -> Response:
    return await forward(request, f"report/{report_id}")
