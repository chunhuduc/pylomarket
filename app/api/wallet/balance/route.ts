import { NextRequest, NextResponse } from "next/server";
import { getBalanceWithUserId } from "@/actions";
import { getUserIdFromToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    console.log("authHeader", authHeader);
    const token = authHeader?.replace("Bearer ", "") || null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Call Server Action
    const result = await getBalanceWithUserId(userId);

    // If balance not found, return success with null balance (user needs to create wallet)
    if (!result.success) {
      if (result.error === "Balance not found") {
        return NextResponse.json({
          success: true,
          balance: null,
          message: "Balance not found. Please create a wallet first.",
        });
      }
      return NextResponse.json(
        { error: result.error || "Failed to get balance" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get balance" },
      { status: 500 }
    );
  }
}
