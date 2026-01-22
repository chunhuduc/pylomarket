import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { searchByValue, insert, update, sql } from "@/lib/harperdb";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    // Find wallet
    const walletResult = await searchByValue("wallets", "solana_address", address, [
      "id",
      "user_id",
    ]);

    if (!walletResult.data || walletResult.data.length === 0) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const wallet = walletResult.data[0];
    const userId = wallet.user_id;

    // Get last processed signature from transactions
    const lastTxResult = await sql(
      `SELECT solana_signature FROM pylomarket.transactions WHERE user_id = '${userId}' AND type = 'deposit' AND solana_signature IS NOT NULL ORDER BY created_at DESC LIMIT 1`
    );

    const lastSignature =
      lastTxResult.data && lastTxResult.data.length > 0
        ? lastTxResult.data[0].solana_signature
        : null;

    // Get recent signatures for this address
    const publicKey = new PublicKey(address);
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit: 20,
    });

    // Filter new signatures
    let newSignatures = signatures;
    if (lastSignature) {
      const lastIndex = signatures.findIndex((sig) => sig.signature === lastSignature);
      if (lastIndex >= 0) {
        newSignatures = signatures.slice(0, lastIndex);
      }
    }

    const deposits = [];

    // Process each new signature
    for (const sigInfo of newSignatures) {
      try {
        const tx = await connection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx || !tx.meta) continue;

        // Check if this is a SOL transfer to our address
        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys;

        // Find our address index
        const ourIndex = accountKeys.findIndex(
          (key) => key.toBase58() === address
        );

        if (ourIndex < 0) continue;

        const preBalance = preBalances[ourIndex];
        const postBalance = postBalances[ourIndex];
        const amount = (postBalance - preBalance) / 1e9; // Convert lamports to SOL

        if (amount > 0) {
          // Check if we already processed this transaction
          const existingTxResult = await searchByValue(
            "transactions",
            "solana_signature",
            sigInfo.signature,
            ["id"]
          );

          if (existingTxResult.data && existingTxResult.data.length > 0) {
            continue; // Already processed
          }

          // Record deposit (amount in USD equivalent - for MVP, 1 SOL = 100 USD)
          const usdAmount = amount * 100;

          // Update balance
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

          balance.balance += usdAmount;
          balance.updated_at = new Date().toISOString();
          await update("balances", [balance]);

          // Record transaction
          const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          await insert("transactions", [
            {
              id: transactionId,
              user_id: userId,
              type: "deposit",
              amount: usdAmount,
              currency: "USD",
              status: "completed",
              solana_signature: sigInfo.signature,
              metadata: JSON.stringify({
                source: "solana",
                solAmount: amount,
                solPrice: 100, // MVP: fixed price
              }),
              created_at: new Date().toISOString(),
            },
          ]);

          deposits.push({
            signature: sigInfo.signature,
            amount: usdAmount,
            solAmount: amount,
            timestamp: sigInfo.blockTime,
          });
        }
      } catch (error) {
        console.error(`Error processing signature ${sigInfo.signature}:`, error);
        // Continue with next signature
      }
    }

    return NextResponse.json({
      success: true,
      deposits,
      count: deposits.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to poll deposits" },
      { status: 500 }
    );
  }
}
