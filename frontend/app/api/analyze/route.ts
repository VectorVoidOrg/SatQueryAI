// frontend/app/api/analyze/route.ts
// Server-side proxy: receives multipart/form-data from browser, forwards to
// the FastAPI backend, returns its response verbatim.
// BACKEND_URL defaults to http://127.0.0.1:8000 (local dev / stub server).
// For Kaggle tunnels: set BACKEND_URL=https://your-tunnel.trycloudflare.com

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();

    const backendRes = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      body,
      // Do not set Content-Type — let fetch set multipart boundary automatically
    });

    const json = await backendRes.json();

    return NextResponse.json(json, { status: backendRes.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    return NextResponse.json(
      { detail: `Backend unreachable: ${msg}` },
      { status: 502 }
    );
  }
}
