// frontend/app/api/health/route.ts
import { NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL ?? "").replace(/\/$/, "");

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { cache: "no-store" });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ status: "unreachable" }, { status: 502 });
  }
}
