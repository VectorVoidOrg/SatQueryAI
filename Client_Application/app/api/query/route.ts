import { NextResponse } from "next/server";
import { generateMockPayload } from "@/lib/api/mockData";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const prompt = (formData.get("prompt") as string) || "";
    const file = formData.get("file") as File | null;

    const fileName: string = file?.name || "";
    const mockResult = generateMockPayload(prompt, fileName);

    return NextResponse.json({
      success: true,
      sessionId: `session_${Date.now()}`,
      data: mockResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process query" },
      { status: 500 }
    );
  }
}