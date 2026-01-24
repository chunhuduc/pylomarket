'use server';

/**
 * Markets Server Actions
 * Replaces MarketResource from resources.js
 */

const SCHEMA = "pylomarket";

// Declare global harperdb type
declare global {
  var harperdb: any;
}

export async function listMarkets(options?: {
  category?: string;
  resolved?: boolean;
  limit?: number;
  offset?: number;
}) {
  try {
    const { category, resolved, limit = 50, offset = 0 } = options || {};
    
    let query = `SELECT * FROM ${SCHEMA}.markets WHERE 1=1`;
    
    if (category) {
      query += ` AND category = '${category}'`;
    }
    if (resolved !== undefined) {
      query += ` AND resolved = ${resolved}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const markets = await harperdb.sql(query);
    return { success: true, markets: markets || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMarket(marketId: string) {
  try {
    const markets = await harperdb.searchByHash(
      SCHEMA,
      "markets",
      [marketId]
    );

    if (!markets || markets.length === 0) {
      return { success: false, error: "Market not found" };
    }

    return { success: true, market: markets[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createMarket(data: {
  title: string;
  description: string;
  category?: string;
  endDate: string;
}) {
  try {
    const { title, description, category, endDate } = data;
    
    const marketId = `market_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    await harperdb.insert(SCHEMA, "markets", [market]);
    return { success: true, market };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resolveMarket(marketId: string, resolution: string) {
  try {
    const markets = await harperdb.searchByHash(
      SCHEMA,
      "markets",
      [marketId]
    );

    if (!markets || markets.length === 0) {
      return { success: false, error: "Market not found" };
    }

    await harperdb.update(SCHEMA, "markets", [{
      id: marketId,
      resolved: true,
      resolution,
      updated_at: new Date().toISOString(),
    }]);

    return { success: true, message: "Market resolved" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
