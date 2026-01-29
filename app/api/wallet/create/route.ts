import { NextRequest, NextResponse } from "next/server";
import { createWalletWithUserId } from "@/actions/wallet";
import { getUserIdFromToken } from "@/lib/jwt";

/**
 * Create a new wallet for the authenticated user
 * POST /api/wallet/create
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

    // Create wallet
    const result = await createWalletWithUserId(userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create wallet" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      wallet: result.wallet,
      message: "Wallet created successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create wallet" },
      { status: 500 }
    );
  }
}
