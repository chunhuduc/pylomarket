import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair } from "@solana/web3.js";
import { searchByValue, insert } from "@/lib/harperdb";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if wallet already exists
    const walletResult = await searchByValue("wallets", "user_id", userId, [
      "id",
      "solana_address",
    ]);

    if (walletResult.data && walletResult.data.length > 0) {
      return NextResponse.json({
        success: true,
        address: walletResult.data[0].solana_address,
        wallet: walletResult.data[0],
      });
    }

    // Generate new Solana keypair (in production, this should be stored securely)
    // For MVP, we'll generate a new keypair per user
    const keypair = Keypair.generate();
    const solanaAddress = keypair.publicKey.toBase58();

    // Store wallet (in production, store the private key securely)
    const walletId = `wallet_${userId}`;
    const wallet = {
      id: walletId,
      user_id: userId,
      solana_address: solanaAddress,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await insert("wallets", [wallet]);

    return NextResponse.json({
      success: true,
      address: solanaAddress,
      wallet,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate address" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const walletResult = await searchByValue("wallets", "user_id", userId, [
      "id",
      "solana_address",
      "created_at",
    ]);

    if (!walletResult.data || walletResult.data.length === 0) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      address: walletResult.data[0].solana_address,
      wallet: walletResult.data[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get address" },
      { status: 500 }
    );
  }
}
