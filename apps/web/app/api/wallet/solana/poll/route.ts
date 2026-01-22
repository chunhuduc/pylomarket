import { NextRequest, NextResponse } from "next/server";
import { solanaFunctions } from "@/lib/harperdb-functions";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    // Call HarperDB custom function
    const result = await solanaFunctions.pollDeposits({ address });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to poll deposits" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to poll deposits" },
      { status: 500 }
    );
  }
}
