import { NextRequest, NextResponse } from "next/server";
import { pollDeposits, getWalletWithUserId } from "@/actions";
import { getUserIdFromToken } from "@/lib/jwt";

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

    // Get user's wallet address
    const walletResult = await getWalletWithUserId(userId);
    if (!walletResult.success || !walletResult.wallet?.solana_address) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    const address = walletResult.wallet.solana_address;

    // Call Server Action
    const result = await pollDeposits(address);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to poll deposits" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to poll deposits" },
      { status: 500 }
    );
  }
}
