import { NextRequest, NextResponse } from "next/server";
import { searchByValue, insert, update } from "@/lib/harperdb";

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

    // Get current balance
    const balanceResult = await searchByValue("balances", "user_id", userId, [
      "id",
      "balance",
    ]);

    let balance;
    if (!balanceResult.data || balanceResult.data.length === 0) {
      const balanceId = `balance_${userId}`;
      balance = {
        id: balanceId,
        user_id: userId,
        balance: 0,
        currency: "USD",
        updated_at: new Date().toISOString(),
      };
      await insert("balances", [balance]);
    } else {
      balance = balanceResult.data[0];
    }

    // Update balance
    balance.balance += amount;
    balance.updated_at = new Date().toISOString();
    await update("balances", [balance]);

    // Record transaction
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await insert("transactions", [
      {
        id: transactionId,
        user_id: userId,
        type: "deposit",
        amount,
        currency: "USD",
        status: "completed",
        solana_signature: solanaSignature || null,
        metadata: JSON.stringify({ source: "solana" }),
        created_at: new Date().toISOString(),
      },
    ]);

    return NextResponse.json({
      success: true,
      balance,
      transactionId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deposit failed" },
      { status: 500 }
    );
  }
}
