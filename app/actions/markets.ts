'use server';

import { databases } from "harperdb";

const { Market } = databases.pylomarket;

/**
 * Markets Server Actions
 */

export async function listMarkets(options?: {
  category?: string;
  resolved?: boolean;
  limit?: number;
  offset?: number;
}) {
  try {
    const { category, resolved, limit = 50, offset = 0 } = options || {};
    
    const filter: any = {};
    if (category) filter.category = category;
    if (resolved !== undefined) filter.resolved = resolved;

    const marketsArray = [];
    for await (const market of Market.search(filter)) {
      // Convert HarperDB object to plain object
      marketsArray.push({
        id: market.id,
        title: market.title,
        description: market.description,
        category: market.category,
        end_date: market.end_date,
        resolved: market.resolved,
        resolution: market.resolution,
        created_at: market.created_at,
        updated_at: market.updated_at,
      });
    }
    
    const markets = marketsArray
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit);
    return { success: true, markets };
  } catch (error: any) {
    console.error('[listMarkets] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getMarket(marketId: string) {
  try {
    const market = await Market.get(marketId);

    if (!market) {
      return { success: false, error: "Market not found" };
    }

    return { success: true, market };
  } catch (error: any) {
    console.error('[getMarket] Error:', error);
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
    
    const market = await Market.create({
      title,
      description,
      category: category || "general",
      end_date: endDate,
      resolved: false,
      resolution: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { success: true, market };
  } catch (error: any) {
    console.error('[createMarket] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function resolveMarket(marketId: string, resolution: string) {
  try {
    const market = await Market.get(marketId);

    if (!market) {
      return { success: false, error: "Market not found" };
    }

    await Market.patch(marketId, {
      resolved: true,
      resolution,
      updated_at: new Date().toISOString(),
    });

    return { success: true, message: "Market resolved" };
  } catch (error: any) {
    console.error('[resolveMarket] Error:', error);
    return { success: false, error: error.message };
  }
}
