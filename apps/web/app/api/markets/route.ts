import { NextRequest, NextResponse } from "next/server";
import { marketFunctions } from "@/lib/harperdb-functions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const resolved = searchParams.get("resolved");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Call HarperDB custom function
    const result = await marketFunctions.listMarkets({
      category: category || undefined,
      resolved: resolved ? resolved === "true" : undefined,
      limit,
      offset,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch markets" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch markets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, category, endDate } = await request.json();

    if (!title || !description || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call HarperDB custom function
    const result = await marketFunctions.createMarket({
      title,
      description,
      category,
      endDate,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create market" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create market" },
      { status: 500 }
    );
  }
}
