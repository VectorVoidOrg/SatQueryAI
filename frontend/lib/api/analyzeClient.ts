// frontend/lib/api/analyzeClient.ts
// Typed client for POST /api/analyze (the Next.js server-side proxy).
// ZERO mock paths, ZERO fallbacks, ZERO localStorage.
// On any error the caller receives it; nothing is swallowed or substituted.

import type { AnalyzeFormValues, AnalyzeResponse, BackendRefusal } from "@/lib/types/analyze";

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

export type AnalyzeResult =
  | { ok: true; data: AnalyzeResponse }
  | { ok: false; status: number; detail: string };

export async function postAnalyze(form: AnalyzeFormValues): Promise<AnalyzeResult> {
  const fd = new FormData();

  fd.append("query", form.query);
  fd.append("bands", form.bands ?? "1,2,3");
  fd.append("dataset", form.dataset ?? "operational");
  if (form.conversationId) {
    fd.append("conversation_id", form.conversationId);
  }
  if (form.conversationContext?.length) {
    fd.append("conversation_context", JSON.stringify(form.conversationContext));
  }

  const modalities = form.images.map((s) => s.modality).join(",");
  const timestamps = form.images.map((s) => s.timestamp).join(",");
  fd.append("modalities", modalities);
  fd.append("timestamps", timestamps);
  fd.append("highlights", JSON.stringify(form.highlightOverrides ?? form.images.map((slot) => slot.highlight ?? null)));

  for (const slot of form.images) {
    fd.append("files", slot.file);
  }

  const res = await fetch("/api/analyze", {
    method: "POST",
    body: fd,
  });

  if (res.ok) {
    const data: AnalyzeResponse = await res.json();
    return { ok: true, data };
  }

  // 400 from backend → render detail verbatim (never auto-retry or substitute)
  let detail = `Server error ${res.status}`;
  try {
    const err: BackendRefusal = await res.json();
    detail = readableErrorDetail(err.detail, detail);
  } catch {
    // body unreadable — keep generic message
  }
  return { ok: false, status: res.status, detail };
}
