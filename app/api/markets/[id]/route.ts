import { NextRequest, NextResponse } from "next/server";
import { getMarket } from "@/actions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;

    // Call Server Action
    const result = await getMarket(marketId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Market not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch market" },
      { status: 500 }
    );
  }
}
