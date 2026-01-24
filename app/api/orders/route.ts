import { NextRequest, NextResponse } from "next/server";
import { placeOrder, getOrders } from "@/actions";

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

    // Call Server Action
    const result = await placeOrder({
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

    return NextResponse.json(result);
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

    // Call Server Action
    const result = await getOrders({
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

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
