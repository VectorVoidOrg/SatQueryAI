// frontend/lib/api/reportClient.ts
// Fetches report data from the Next.js proxy for GET /api/report/[id].

import type { AnalyzeResponse } from "@/lib/types/analyze";

function readableErrorDetail(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const messages = value.map((item) => readableErrorDetail(item, "")).filter(Boolean);
    if (messages.length > 0) return messages.join("; ");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.msg === "string") return record.msg;
    if ("detail" in record) return readableErrorDetail(record.detail, fallback);
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export type ReportResult =
  | { ok: true; data: AnalyzeResponse }
  | { ok: false; status: number; detail: string };

export async function fetchReportJson(reportId: string): Promise<ReportResult> {
  const res = await fetch(`/api/report/${reportId}?format=json&download=0`, { cache: "no-store" });

  if (res.ok) {
    const data: AnalyzeResponse = await res.json();
    return { ok: true, data };
  }

  let detail = `Report not found (${res.status})`;
  try {
    const err = await res.json();
    detail = readableErrorDetail(err.detail, detail);
  } catch {
    // ignore
  }
  return { ok: false, status: res.status, detail };
}
