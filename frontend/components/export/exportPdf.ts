import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { ChatMessage, AuditRecord } from "@/lib/types/chat";

export interface ExportPdfParams {
  aoiName: string;
  assetId: string | null;
  sessionId: string;
  messages: ChatMessage[];
  latestAudit: { query: string; audit: AuditRecord } | null;
  bbox: [number, number, number, number] | null;
  selectedEvidence?: GeoJSON.Feature[];
}

export async function exportReportToPdf({
  aoiName,
  assetId,
  sessionId,
  messages,
  latestAudit,
  bbox,
  selectedEvidence,
}: ExportPdfParams): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header band
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("SATQUERY AI — ANALYTICAL REPORT", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `AOI: ${aoiName}  |  Asset ID: ${assetId || "N/A"}  |  Session: ${sessionId}  |  Generated: ${new Date().toISOString()}`,
    margin,
    20
  );

  let cursorY = 36;

  // Bounding box & context card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, contentWidth, 18, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("GEOSPATIAL REFERENCE (EPSG:4326):", margin + 4, cursorY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const bboxStr = bbox
    ? `MinLon: ${bbox[0].toFixed(3)}, MinLat: ${bbox[1].toFixed(3)}, MaxLon: ${bbox[2].toFixed(3)}, MaxLat: ${bbox[3].toFixed(3)}`
    : "Global extent";
  doc.text(bboxStr, margin + 4, cursorY + 13);

  cursorY += 24;

  // 1. Capture Map Canvas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("1. SATELLITE CANVAS VIEWPORT SNAPSHOT", margin, cursorY);
  cursorY += 4;

  const mapElement = document.getElementById("satquery-map-container");

  let mapCaptured = false;
  if (mapElement) {
    try {
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 1.5,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.85);
      const imgHeight = (contentWidth * 9) / 16; // 16:9 ratio

      doc.addImage(imgData, "JPEG", margin, cursorY, contentWidth, imgHeight);
      cursorY += imgHeight + 8;
      mapCaptured = true;
    } catch (e) {
      console.warn("Could not capture map screenshot via html2canvas:", e);
    }
  }

  if (!mapCaptured) {
    // Fallback graphic container
    doc.setFillColor(15, 23, 42);
    const fallbackHeight = 60;
    doc.rect(margin, cursorY, contentWidth, fallbackHeight, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("[ Leaflet Multi-band Canvas — Captured at EPSG:4326 ]", margin + 10, cursorY + 30);
    cursorY += fallbackHeight + 8;
  }

  // 2. Audit Metrics on Page 1 if space permits
  if (latestAudit && latestAudit.audit) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("2. VERIFIED MODEL ORCHESTRATION & METRICS", margin, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Query Turn: "${latestAudit.query}"`, margin, cursorY);
    cursorY += 5;

    // Metrics table
    const metrics = latestAudit.audit.metrics || {};
    const metricKeys = Object.keys(metrics);

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, cursorY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text("Metric", margin + 4, cursorY + 5);
    doc.text("Value", margin + contentWidth - 30, cursorY + 5);
    cursorY += 7;

    doc.setFont("helvetica", "normal");
    for (const key of metricKeys) {
      doc.text(key.toUpperCase(), margin + 4, cursorY + 5);
      doc.text(String(metrics[key]), margin + contentWidth - 30, cursorY + 5);
      cursorY += 6;
    }
  }

  // 3. Annotated Evidence Zones (if added via Evidence Detail Panel)
  if (selectedEvidence && selectedEvidence.length > 0) {
    cursorY += 6;
    if (cursorY > pageHeight - 40) {
      doc.addPage();
      cursorY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("3. ANNOTATED SPATIAL EVIDENCE ZONES", margin, cursorY);
    cursorY += 6;

    for (const feat of selectedEvidence) {
      const p = feat.properties || {};
      const name = p.class || p.name || "Evidence Feature";
      const conf = p.confidence ? ` (Confidence: ${(p.confidence * 100).toFixed(0)}%)` : "";
      const area = p.area_m2 ? ` | Area: ${Number(p.area_m2).toLocaleString()} m²` : "";
      const rate = p.retreat_rate_m_yr ? ` | Retreat: ${p.retreat_rate_m_yr} m/yr` : "";

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`• ${name}${conf}${area}${rate}`, margin + 4, cursorY);
      cursorY += 5;
    }
  }

  // Page 2: Chat Transcript
  doc.addPage();

  // Header band for Page 2
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("SATQUERY AI — ANALYST CHAT TRANSCRIPT", margin, 13);

  cursorY = 28;

  for (const msg of messages) {
    if (cursorY > pageHeight - 30) {
      doc.addPage();
      cursorY = 20;
    }

    const isUser = msg.role === "user";
    const sender = isUser ? "ANALYST" : "SATQUERY AI VISION ASSISTANT";
    const time = new Date(msg.createdAt).toLocaleTimeString();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(isUser ? 37 : 15, isUser ? 99 : 23, isUser ? 235 : 42);
    doc.text(`${sender} (${time}):`, margin, cursorY);
    cursorY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    const splitText = doc.splitTextToSize(msg.text || "", contentWidth - 8);
    doc.text(splitText, margin + 4, cursorY);
    cursorY += splitText.length * 4.2 + 5;
  }

  // Save PDF
  doc.save(`SatQuery-Report-${aoiName}-${Date.now()}.pdf`);
}
