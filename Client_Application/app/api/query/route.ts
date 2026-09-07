import { NextResponse } from "next/server";
import { generateMockPayload } from "@/lib/api/mockData";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const prompt = (formData.get("prompt") as string) || "";
    const file = formData.get("file") as File | null;

    if (process.env.DEBUG_REQUESTS === "true") {
      console.info("[query] received request", {
        prompt,
        file: file
          ? { name: file.name, size: file.size, type: file.type }
          : null,
      });
    }

    const modelUrl = process.env.ML_QUERY_URL;
    if (modelUrl) {
      const modelResponse = await fetch(modelUrl, {
        method: "POST",
        body: formData,
      });

      return new NextResponse(await modelResponse.arrayBuffer(), {
        status: modelResponse.status,
        headers: {
          "content-type": modelResponse.headers.get("content-type") || "application/json",
        },
      });
    }

    const fileName: string = file?.name || "";
    const mockResult = generateMockPayload(prompt, fileName);

    return NextResponse.json({
      success: true,
      sessionId: `session_${Date.now()}`,
      ...mockResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process query";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}