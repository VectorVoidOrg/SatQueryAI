// frontend/app/api/analyze/route.ts
// Server-side proxy: receives multipart/form-data from browser, forwards to
// the FastAPI backend, returns its response verbatim.
// BACKEND_URL points to the deployed FastAPI service or its Cloudflare tunnel.

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL ?? "").replace(/\/$/, "");

function upstreamDetail(status: number, contentType: string, body: string) {
  if (contentType.includes("application/json")) {
    try {
      const payload = JSON.parse(body) as { detail?: unknown };
      if (typeof payload.detail === "string") return payload.detail;
      if (Array.isArray(payload.detail)) {
        return payload.detail
          .map((item) => (item && typeof item === "object" && "msg" in item ? String(item.msg) : String(item)))
          .join("; ");
      }
    } catch {
      // Fall through to the bounded upstream error below.
    }
  }

  const source = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
  if (status >= 500 || !contentType.includes("json")) {
    return `Analysis backend returned HTTP ${status}${source ? `: ${source}` : ". Check that BACKEND_URL and the backend tunnel are running."}`;
  }
  return source || `Analysis backend returned HTTP ${status}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();

    if (!BACKEND_URL) {
      return NextResponse.json(
        { detail: "BACKEND_URL is not configured for the analysis proxy." },
        { status: 502 },
      );
    }

    const backendRes = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      body,
      // Do not set Content-Type — let fetch set multipart boundary automatically
    });

    const contentType = backendRes.headers.get("content-type") ?? "";
    const responseBody = await backendRes.text();
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { detail: upstreamDetail(backendRes.status, contentType, responseBody) },
        { status: backendRes.status >= 400 ? backendRes.status : 502 },
      );
    }

    try {
      return NextResponse.json(JSON.parse(responseBody), { status: backendRes.status });
    } catch {
      return NextResponse.json(
        { detail: upstreamDetail(backendRes.status, contentType, responseBody) },
        { status: 502 },
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    return NextResponse.json(
      { detail: `Backend unreachable: ${msg}` },
      { status: 502 }
    );
  }
}
