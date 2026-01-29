import { NextRequest, NextResponse } from "next/server";
import { getWalletWithUserId } from "@/actions";
import { getUserIdFromToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
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

    // Get wallet using Server Action
    const result = await getWalletWithUserId(userId);

    // If wallet not found, return success with null wallet (user needs to create wallet)
    if (!result.success || !result.wallet) {
      return NextResponse.json({
        success: true,
        address: null,
        wallet: null,
        message: "Wallet not found. Please create a wallet first.",
      });
    }

    return NextResponse.json({
      success: true,
      address: result.wallet.solana_address,
      wallet: result.wallet,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get address" },
      { status: 500 }
    );
  }
}
