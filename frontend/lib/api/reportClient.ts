// frontend/lib/api/reportClient.ts
// Fetches report data from the Next.js proxy for GET /api/report/[id].

import type { AnalyzeResponse } from "@/lib/types/analyze";

export type ReportResult =
  | { ok: true; data: AnalyzeResponse }
  | { ok: false; status: number; detail: string };

export async function fetchReportJson(reportId: string): Promise<ReportResult> {
  const res = await fetch(`/api/report/${reportId}`, { cache: "no-store" });

  if (res.ok) {
    const data: AnalyzeResponse = await res.json();
    return { ok: true, data };
  }

  let detail = `Report not found (${res.status})`;
  try {
    const err = await res.json();
    detail = err.detail ?? detail;
  } catch {
    // ignore
  }
  return { ok: false, status: res.status, detail };
}
