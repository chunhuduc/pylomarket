import { NextRequest, NextResponse } from "next/server";
import { getBalanceWithUserId, debitWithdrawal } from "@/actions";
import { sendSOL } from "@/actions/solana";
import { getUserIdFromToken } from "@/lib/jwt";

/**
 * Withdraw SOL from user balance
 * POST /api/wallet/withdraw
 * Body: { toAddress: string, amount: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { toAddress, amount } = await request.json();

    // Validate input
    if (!toAddress || typeof toAddress !== 'string') {
      return NextResponse.json(
        { error: "Invalid withdrawal address" },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be greater than 0" },
        { status: 400 }
      );
    }

    // Check minimum withdrawal (e.g., 0.01 SOL)
    const MIN_WITHDRAWAL = 0.01;
    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is ${MIN_WITHDRAWAL} SOL` },
        { status: 400 }
      );
    }

    // Check user balance
    const balanceResult = await getBalanceWithUserId(userId);
    if (!balanceResult.success || !balanceResult.balance) {
      return NextResponse.json(
        { error: "Balance not found. Please create a wallet first." },
        { status: 404 }
      );
    }

    const currentBalance = balanceResult.balance?.balance || 0;
    if (currentBalance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Send SOL from hot wallet
    const sendResult = await sendSOL(toAddress, amount);

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || "Failed to send SOL" },
        { status: 500 }
      );
    }

    // Debit user balance
    if (!sendResult.signature) {
      return NextResponse.json(
        { error: "Transaction signature not found" },
        { status: 500 }
      );
    }

    // Record withdrawal transaction
    const debitResult = await debitWithdrawal(
      userId,
      amount,
      sendResult.signature,
      toAddress
    );

    if (!debitResult.success) {
      // Transaction was sent but failed to record - log for manual review
      console.error(`Withdrawal sent but failed to record transaction: ${sendResult.signature}`);
      // Still return success since SOL was sent
    }

    // Get updated balance from blockchain
    const updatedBalanceResult = await getBalanceWithUserId(userId);
    const newBalance = updatedBalanceResult.success 
      ? updatedBalanceResult.balance?.balance || 0 
      : currentBalance - amount;

    return NextResponse.json({
      success: true,
      signature: sendResult.signature,
      newBalance,
      message: "Withdrawal successful",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Withdrawal failed" },
      { status: 500 }
    );
  }
}
