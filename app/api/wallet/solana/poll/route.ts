import { NextRequest, NextResponse } from "next/server";
import { pollDeposits } from "@/actions";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    // Call Server Action
    const result = await pollDeposits(address);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to poll deposits" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to poll deposits" },
      { status: 500 }
    );
  }
}
