import { NextRequest, NextResponse } from "next/server";
import { searchByHash, searchByValue } from "@/lib/harperdb";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const marketId = params.id;

    const result = await searchByHash("markets", [marketId]);

    if (!result.data || result.data.length === 0) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const market = result.data[0];

    // Get order book stats
    const ordersResult = await searchByValue(
      "orders",
      "market_id",
      marketId,
      ["side", "outcome", "price", "quantity", "filled_quantity", "status"]
    );

    const orders = ordersResult.data || [];
    const yesOrders = orders.filter(
      (o: any) => o.outcome === "YES" && o.status === "open"
    );
    const noOrders = orders.filter(
      (o: any) => o.outcome === "NO" && o.status === "open"
    );

    // Calculate best prices
    const bestYesPrice =
      yesOrders.length > 0
        ? Math.max(...yesOrders.map((o: any) => o.price))
        : null;
    const bestNoPrice =
      noOrders.length > 0 ? Math.max(...noOrders.map((o: any) => o.price)) : null;

    return NextResponse.json({
      success: true,
      market,
      orderbook: {
        yes: {
          bestPrice: bestYesPrice,
          orderCount: yesOrders.length,
        },
        no: {
          bestPrice: bestNoPrice,
          orderCount: noOrders.length,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch market" },
      { status: 500 }
    );
  }
}
