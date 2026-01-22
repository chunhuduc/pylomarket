import { NextRequest, NextResponse } from "next/server";
import { orderbookFunctions } from "@/lib/harperdb-functions";

export async function POST(request: NextRequest) {
  try {
    const { marketId, side, outcome, price, quantity } = await request.json();
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!marketId || !side || !outcome || !price || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call HarperDB custom function
    const result = await orderbookFunctions.placeOrder({
      userId,
      marketId,
      side,
      outcome,
      price,
      quantity,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to place order" },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to place order" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const marketId = searchParams.get("marketId");
    const status = searchParams.get("status");

    // Call HarperDB custom function
    const result = await orderbookFunctions.getOrders({
      userId: userId || undefined,
      marketId: marketId || undefined,
      status: status || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch orders" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
