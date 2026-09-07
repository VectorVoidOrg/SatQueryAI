import { NextResponse } from "next/server";
import { sendChatQuery } from "@/lib/api/middlewareClient";

export async function POST(req: Request) {
  try {
    let prompt = "";
    let fileName = "";
    let fileSize = 0;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      prompt = (formData.get("prompt") as string) || "";
      const file = formData.get("file") as File | null;
      if (file) {
        fileName = file.name;
        fileSize = file.size;
      }
    } else {
      const json = await req.json().catch(() => ({}));
      prompt = json.prompt || json.message || "";
      fileName = json.fileName || "";
    }

    if (!prompt && !fileName) {
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: "Prompt text or GeoTIFF file is required." } },
        { status: 400 }
      );
    }

    const sessionId = `c_${Math.random().toString(36).substring(2, 9)}`;
    const assetId = `ast_${Math.random().toString(36).substring(2, 9)}`;
    const assetName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "Sundarbans_2026Q1";

    // Run remote sensing vision-language inference
    const chatResult = await sendChatQuery({
      session_id: sessionId,
      asset_id: assetId,
      message: prompt || "Analyze multi-spectral GeoTIFF surface changes and displacement.",
    });

    return NextResponse.json({
      sessionId,
      assetId,
      assetName,
      status: "ready",
      text: chatResult.text,
      evidence: chatResult.evidence,
      audit: chatResult.audit,
      bbox: [88.021, 21.678, 88.412, 21.983],
      layers: {
        optical: {
          type: "tile",
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        },
        sar: {
          type: "tile",
          url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: err.message || "Pipeline processing error." } },
      { status: 500 }
    );
  }
}
