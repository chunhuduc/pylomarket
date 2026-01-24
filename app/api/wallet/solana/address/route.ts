import { NextRequest, NextResponse } from "next/server";
import { getWallet } from "@/actions";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get wallet using Server Action
    const result = await getWallet(userId);

    if (!result.success) {
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
