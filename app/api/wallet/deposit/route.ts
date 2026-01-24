import { NextRequest, NextResponse } from "next/server";
import { updateBalance } from "@/actions";

export async function POST(request: NextRequest) {
  try {
    const { amount, solanaSignature } = await request.json();
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Update balance using Server Action
    const result = await updateBalance(userId, amount, "deposit");

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Deposit failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deposit failed" },
      { status: 500 }
    );
  }
}
