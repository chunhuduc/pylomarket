import { NextRequest, NextResponse } from "next/server";
import { getWallet } from "@/actions";
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
    const result = await getWallet(userId);

    if (!result.success || !result.wallet) {
      return NextResponse.json(
        { error: result.error || "Wallet not found" },
        { status: 404 }
      );
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
