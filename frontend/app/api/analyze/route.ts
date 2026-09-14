// frontend/app/api/analyze/route.ts
// Server-side proxy: receives multipart/form-data from browser, forwards to
// the FastAPI backend, returns its response verbatim.
// BACKEND_URL points to the deployed FastAPI service or its Cloudflare tunnel.

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL ?? "").replace(/\/$/, "");

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
