import { NextResponse } from "next/server";
import { extractAll } from "@/lib/gemini";

/**
 * POST /api/import
 * Process raw CSV rows using the AI extraction pipeline.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json(
        { error: "rows array is required and must not be empty" },
        { status: 400 }
      );
    }

    const result = await extractAll(body.rows);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[POST /api/import] Route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || error },
      { status: 500 }
    );
  }
}
