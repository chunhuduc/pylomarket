import { NextRequest, NextResponse } from "next/server";
import { checkNewDeposits, getWallet, getTransactions } from "@/actions";
import { creditDeposit } from "@/actions/wallet";
import { getUserIdFromToken } from "@/lib/jwt";

/**
 * Check for new deposits and credit balance automatically
 * POST /api/wallet/solana/check-deposits
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

    // Get user's wallet
    const walletResult = await getWallet(userId);
    if (!walletResult.success || !walletResult.wallet?.solana_address) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    const address = walletResult.wallet.solana_address;

    // Get all deposit transactions to check for duplicates
    const transactionsResult = await getTransactions(userId, 100);
    const processedSignatures = new Set(
      transactionsResult.success && transactionsResult.transactions
        ? transactionsResult.transactions
            .filter(tx => tx.type === 'deposit' && tx.solana_signature)
            .map(tx => tx.solana_signature)
        : []
    );

    // Get last processed transaction signature for optimization
    const lastTransaction = transactionsResult.success && transactionsResult.transactions && transactionsResult.transactions.length > 0
      ? transactionsResult.transactions.find(tx => tx.type === 'deposit' && tx.solana_signature)
      : null;
    const lastProcessedSignature = lastTransaction?.solana_signature || undefined;

    // Check for new deposits
    const depositsResult = await checkNewDeposits(address, lastProcessedSignature);

    if (!depositsResult.success) {
      return NextResponse.json(
        { error: depositsResult.error || "Failed to check deposits" },
        { status: 500 }
      );
    }

    const newDeposits = depositsResult.newDeposits || [];
    let creditedCount = 0;
    const errors: string[] = [];

    // Credit each new deposit
    for (const deposit of newDeposits) {
      // Skip if already processed
      if (processedSignatures.has(deposit.signature)) {
        continue;
      }

      // Credit the deposit
      const creditResult = await creditDeposit(
        userId,
        deposit.amount,
        deposit.signature,
        address
      );

      if (creditResult.success) {
        creditedCount++;
      } else {
        errors.push(`Failed to credit deposit ${deposit.signature}: ${creditResult.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      newDepositsFound: newDeposits.length,
      creditedCount,
      deposits: newDeposits,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check deposits" },
      { status: 500 }
    );
  }
}
