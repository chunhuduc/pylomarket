import { NextRequest, NextResponse } from "next/server";
import { listMarkets, createMarket } from "@/actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const resolved = searchParams.get("resolved");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Call Server Action (recommended pattern from official example)
    const result = await listMarkets({
      category: category || undefined,
      resolved: resolved ? resolved === "true" : undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /markets GET] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch markets"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, category, endDate } = await request.json();

    if (!title || !description || !endDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call Server Action (recommended pattern from official example)
    const result = await createMarket({
      title,
      description,
      category,
      endDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /markets POST] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create market"
      },
      { status: 500 }
    );
  }
}
