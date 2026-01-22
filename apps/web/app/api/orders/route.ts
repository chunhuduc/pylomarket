import { NextRequest, NextResponse } from "next/server";
import { insert, searchByValue, update, sql } from "@/lib/harperdb";

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

    if (side !== "buy" && side !== "sell") {
      return NextResponse.json({ error: "Invalid side" }, { status: 400 });
    }

    if (outcome !== "YES" && outcome !== "NO") {
      return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
    }

    if (price < 0 || price > 1) {
      return NextResponse.json(
        { error: "Price must be between 0 and 1" },
        { status: 400 }
      );
    }

    // Check user balance
    const balanceResult = await searchByValue("balances", "user_id", userId, [
      "balance",
    ]);

    if (!balanceResult.data || balanceResult.data.length === 0) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    const balance = balanceResult.data[0];
    const totalCost = quantity * price;

    if (balance.balance < totalCost) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Create order
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const order = {
      id: orderId,
      market_id: marketId,
      user_id: userId,
      side,
      outcome,
      price,
      quantity,
      filled_quantity: 0,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await insert("orders", [order]);

    // Try to match orders (simplified - in production, this should be more robust)
    await matchOrders(marketId);

    return NextResponse.json({
      success: true,
      order,
    });
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

    let query = "SELECT * FROM pylomarket.orders WHERE 1=1";

    if (userId) {
      query += ` AND user_id = '${userId}'`;
    }

    if (marketId) {
      query += ` AND market_id = '${marketId}'`;
    }

    if (status) {
      query += ` AND status = '${status}'`;
    }

    query += " ORDER BY created_at DESC";

    const result = await sql(query);

    return NextResponse.json({
      success: true,
      orders: result.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// Simplified order matching (for MVP)
async function matchOrders(marketId: string) {
  // This is a simplified version - in production, this should be more sophisticated
  // For now, we'll just mark orders as matched if there are compatible orders
  // Full implementation would be in the HarperDB custom function
}
