import { NextRequest, NextResponse } from "next/server";
import { getTransactions } from "@/actions";
import { getUserIdFromToken } from "@/lib/jwt";

/**
 * Get user's transaction history
 * GET /api/wallet/transactions?limit=50
 */
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

    // Get limit from query params
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Get transactions
    const result = await getTransactions(userId, limit);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to get transactions" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get transactions" },
      { status: 500 }
    );
  }
}
