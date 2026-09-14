import { jsPDF } from "jspdf";
import type { AnalyzeResponse } from "@/lib/types/analyze";

export interface PdfConversationTurn {
  query: string;
  response: AnalyzeResponse;
}

function addWrappedText(document: jsPDF, text: string, x: number, y: number, width: number, fontSize = 10) {
  document.setFontSize(fontSize);
  const lines = document.splitTextToSize(String(text ?? ""), width) as string[];
  const lineHeight = fontSize * 0.48;
  for (const line of lines) {
    if (y > 275) {
      document.addPage();
      y = 18;
    }
    document.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function addSectionTitle(document: jsPDF, title: string, y: number) {
  if (y > 266) {
    document.addPage();
    y = 18;
  }
  document.setFont("helvetica", "bold");
  document.setFontSize(11);
  document.text(title, 16, y);
  document.setFont("helvetica", "normal");
  return y + 7;
}

export function downloadConversationPdf(turns: PdfConversationTurn[]) {
  const document = new jsPDF({ unit: "mm", format: "a4" });
  let y = 18;

  document.setFont("helvetica", "bold");
  document.setFontSize(18);
  document.text("SatQuery AI conversation", 16, y);
  y += 8;
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(90, 101, 114);
  document.text(`${turns.length} analysis turn${turns.length === 1 ? "" : "s"} | ${new Date().toLocaleString()}`, 16, y);
  document.setTextColor(20, 24, 29);
  y += 10;

  turns.forEach((turn, index) => {
    y = addSectionTitle(document, `Turn ${index + 1}`, y);
    document.setFont("helvetica", "bold");
    y = addWrappedText(document, `Question: ${turn.query}`, 16, y, 178, 10) + 3;
    document.setFont("helvetica", "normal");
    y = addWrappedText(document, `Answer: ${turn.response.answer}`, 16, y, 178, 10) + 3;

    y = addSectionTitle(document, "Analysis fields", y);
    const fields = [
      `Task: ${turn.response.task_intent}`,
      `Confidence: ${(turn.response.confidence * 100).toFixed(1)}% (${turn.response.confidence_source})`,
      `Duration: ${turn.response.duration_seconds}s`,
    ];
    for (const field of fields) y = addWrappedText(document, field, 20, y, 174, 9) + 1;

    if (turn.response.inputs?.length) {
      y = addSectionTitle(document, "Inputs", y + 2);
      for (const input of turn.response.inputs) {
        y = addWrappedText(document, `${input.filename} | ${input.modality} | ${input.timestamp ?? "No timestamp"}`, 20, y, 174, 9) + 1;
      }
    }

    const evidence = turn.response.visual_evidence;
    if (evidence && (evidence.region_count !== undefined || evidence.changed_pixel_fraction !== undefined)) {
      y = addSectionTitle(document, "Statistical evidence", y + 2);
      if (evidence.region_count !== undefined) y = addWrappedText(document, `Detected regions: ${evidence.region_count}`, 20, y, 174, 9) + 1;
      if (evidence.changed_pixel_fraction !== undefined) y = addWrappedText(document, `Changed pixel fraction: ${(evidence.changed_pixel_fraction * 100).toFixed(2)}%`, 20, y, 174, 9) + 1;
    }

    y += 5;
    document.setDrawColor(220, 224, 230);
    document.line(16, y, 194, y);
    y += 8;
  });

  document.save(`satquery-conversation-${new Date().toISOString().slice(0, 10)}.pdf`);
}
