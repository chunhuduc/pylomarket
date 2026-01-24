import { NextRequest, NextResponse } from "next/server";
import { marketFunctions } from "@/lib/harperdb-functions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;

    // Call HarperDB custom function
    const result = await marketFunctions.getMarket(marketId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Market not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch market" },
      { status: 500 }
    );
  }
}
