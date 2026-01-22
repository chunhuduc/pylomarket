import { NextRequest, NextResponse } from "next/server";
import { sql, insert } from "@/lib/harperdb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const resolved = searchParams.get("resolved");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = "SELECT * FROM pylomarket.markets WHERE 1=1";

    if (category) {
      query += ` AND category = '${category}'`;
    }

    if (resolved !== null && resolved !== undefined) {
      query += ` AND resolved = ${resolved === "true" ? "true" : "false"}`;
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const result = await sql(query);

    return NextResponse.json({
      success: true,
      markets: result.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch markets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, category, endDate } = await request.json();

    if (!title || !description || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const marketId = `market_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const market = {
      id: marketId,
      title,
      description,
      category: category || "general",
      end_date: endDate,
      resolved: false,
      resolution: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await insert("markets", [market]);

    return NextResponse.json({
      success: true,
      market,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create market" },
      { status: 500 }
    );
  }
}
