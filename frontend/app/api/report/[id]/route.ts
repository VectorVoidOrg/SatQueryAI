// frontend/app/api/report/[id]/route.ts
// Proxy for GET /report/{id} — supports ?format=json and download params.

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "html";
  const download = searchParams.get("download") ?? "1";

  try {
    const url = `${BACKEND_URL}/report/${id}?format=${format}&download=${download}`;
    const backendRes = await fetch(url, { cache: "no-store" });

    if (format === "json") {
      const json = await backendRes.json();
      return NextResponse.json(json, { status: backendRes.status });
    }

    // HTML response — stream through with correct headers
    const html = await backendRes.text();
    const headers = new Headers();
    headers.set("Content-Type", "text/html; charset=utf-8");
    const disposition = backendRes.headers.get("Content-Disposition");
    if (disposition) headers.set("Content-Disposition", disposition);

    return new NextResponse(html, { status: backendRes.status, headers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    return NextResponse.json(
      { detail: `Backend unreachable: ${msg}` },
      { status: 502 }
    );
  }
}
