/**
 * HarperDB Custom Function: Markets Management
 * Handles market creation, listing, and resolution
 */

module.exports = async (req, res) => {
  const { operation, data } = req.body;

  try {
    switch (operation) {
      case "create_market":
        return await createMarket(data);
      case "list_markets":
        return await listMarkets(data);
      case "get_market":
        return await getMarket(data.marketId);
      case "resolve_market":
        return await resolveMarket(data);
      default:
        return res.status(400).json({ error: "Invalid operation" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

async function createMarket(data) {
  const { title, description, category, endDate } = data;

  if (!title || !description || !endDate) {
    throw new Error("Missing required fields");
  }

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

  await harperdb.insert("markets", [market]);

  return {
    success: true,
    market,
  };
}

async function listMarkets(data = {}) {
  const { category, resolved, limit = 50, offset = 0 } = data;

  let query = "SELECT * FROM pylomarket.markets WHERE 1=1";

  if (category) {
    query += ` AND category = '${category}'`;
  }

  if (resolved !== undefined) {
    query += ` AND resolved = ${resolved}`;
  }

  query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const markets = await harperdb.sql(query);

  return {
    success: true,
    markets: markets || [],
  };
}

async function getMarket(marketId) {
  const markets = await harperdb.searchByHash("markets", [marketId]);

  if (markets.length === 0) {
    return { success: false, error: "Market not found" };
  }

  // Get order book stats
  const orders = await harperdb.searchByValue(
    "orders",
    "market_id",
    marketId,
    ["side", "outcome", "price", "quantity", "filled_quantity", "status"]
  );

  const yesOrders = orders.filter(
    (o) => o.outcome === "YES" && o.status === "open"
  );
  const noOrders = orders.filter(
    (o) => o.outcome === "NO" && o.status === "open"
  );

  // Calculate best prices
  const bestYesPrice =
    yesOrders.length > 0
      ? Math.max(...yesOrders.map((o) => o.price))
      : null;
  const bestNoPrice =
    noOrders.length > 0 ? Math.max(...noOrders.map((o) => o.price)) : null;

  return {
    success: true,
    market: markets[0],
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
  };
}

async function resolveMarket(data) {
  const { marketId, resolution } = data; // resolution: 'YES' or 'NO'

  if (!marketId || !resolution) {
    throw new Error("Missing required fields");
  }

  if (resolution !== "YES" && resolution !== "NO") {
    throw new Error("Resolution must be YES or NO");
  }

  const markets = await harperdb.searchByHash("markets", [marketId]);

  if (markets.length === 0) {
    throw new Error("Market not found");
  }

  const market = markets[0];
  if (market.resolved) {
    throw new Error("Market already resolved");
  }

  market.resolved = true;
  market.resolution = resolution;
  market.updated_at = new Date().toISOString();

  await harperdb.update("markets", [market]);

  // TODO: Settle all trades for this market
  // This would involve updating balances for all users with positions

  return {
    success: true,
    market,
  };
}
