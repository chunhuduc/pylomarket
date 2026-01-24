import { NextRequest, NextResponse } from "next/server";
import { walletFunctions } from "@/lib/harperdb-functions";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call HarperDB custom function
    const result = await walletFunctions.getBalance(userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to get balance" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get balance" },
      { status: 500 }
    );
  }
}
