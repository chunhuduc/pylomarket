import { NextRequest, NextResponse } from "next/server";
import { searchByValue, insert, update } from "@/lib/harperdb";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await searchByValue("balances", "user_id", userId, [
      "id",
      "user_id",
      "balance",
      "currency",
      "updated_at",
    ]);

    if (!result.data || result.data.length === 0) {
      // Create default balance
      const balanceId = `balance_${userId}`;
      const balance = {
        id: balanceId,
        user_id: userId,
        balance: 0,
        currency: "USD",
        updated_at: new Date().toISOString(),
      };
      await insert("balances", [balance]);
      return NextResponse.json({ success: true, balance });
    }

    return NextResponse.json({
      success: true,
      balance: result.data[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get balance" },
      { status: 500 }
    );
  }
}
