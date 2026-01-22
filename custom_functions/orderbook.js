/**
 * HarperDB Custom Function: Order Book Management
 * Handles order placement, matching, and trade execution
 * 
 * Auto-deployed by HarperDB when in custom_functions folder
 */

module.exports = async (req, res) => {
  const { operation, data } = req.body;

  try {
    switch (operation) {
      case "place_order":
        return await placeOrder(data);
      case "cancel_order":
        return await cancelOrder(data);
      case "get_orders":
        return await getOrders(data);
      case "get_orderbook":
        return await getOrderbook(data.marketId);
      case "match_orders":
        return await matchOrders(data.marketId);
      default:
        return res.status(400).json({ error: "Invalid operation" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

async function placeOrder(data) {
  const { userId, marketId, side, outcome, price, quantity } = data;

  if (!userId || !marketId || !side || !outcome || !price || !quantity) {
    throw new Error("Missing required fields");
  }

  if (side !== "buy" && side !== "sell") {
    throw new Error("Side must be 'buy' or 'sell'");
  }

  if (outcome !== "YES" && outcome !== "NO") {
    throw new Error("Outcome must be 'YES' or 'NO'");
  }

  if (price < 0 || price > 1) {
    throw new Error("Price must be between 0 and 1");
  }

  // Check user balance
  const balances = await harperdb.searchByValue(
    "pylomarket",
    "balances",
    "user_id",
    userId,
    ["balance"]
  );

  if (!balances || balances.length === 0 || balances[0].balance < quantity * price) {
    throw new Error("Insufficient balance");
  }

  // Create order
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  await harperdb.insert("pylomarket", "orders", [order]);

  // Try to match orders
  await matchOrders(marketId);

  return res.json({
    success: true,
    order,
  });
}

async function cancelOrder(data) {
  const { orderId, userId } = data;

  const orders = await harperdb.searchByHash(
    "pylomarket",
    "orders",
    [orderId]
  );

  if (!orders || orders.length === 0) {
    throw new Error("Order not found");
  }

  const order = orders[0];

  if (order.user_id !== userId) {
    throw new Error("Unauthorized");
  }

  if (order.status !== "open") {
    throw new Error("Order cannot be cancelled");
  }

  order.status = "cancelled";
  order.updated_at = new Date().toISOString();

  await harperdb.update("pylomarket", "orders", [order]);

  return res.json({
    success: true,
    order,
  });
}

async function getOrders(data) {
  const { userId, marketId, status } = data;

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

  const orders = await harperdb.sql(query);

  return res.json({
    success: true,
    orders: orders || [],
  });
}

async function getOrderbook(marketId) {
  const orders = await harperdb.searchByValue(
    "pylomarket",
    "orders",
    "market_id",
    marketId,
    ["id", "side", "outcome", "price", "quantity", "filled_quantity", "status"]
  );

  const ordersList = orders || [];
  const openOrders = ordersList.filter((o) => o.status === "open");

  // Group by outcome and side
  const yesBuyOrders = openOrders
    .filter((o) => o.outcome === "YES" && o.side === "buy")
    .sort((a, b) => b.price - a.price);
  const yesSellOrders = openOrders
    .filter((o) => o.outcome === "YES" && o.side === "sell")
    .sort((a, b) => a.price - b.price);
  const noBuyOrders = openOrders
    .filter((o) => o.outcome === "NO" && o.side === "buy")
    .sort((a, b) => b.price - a.price);
  const noSellOrders = openOrders
    .filter((o) => o.outcome === "NO" && o.side === "sell")
    .sort((a, b) => a.price - b.price);

  return res.json({
    success: true,
    orderbook: {
      YES: {
        buy: yesBuyOrders,
        sell: yesSellOrders,
        bestBid: yesBuyOrders.length > 0 ? yesBuyOrders[0].price : null,
        bestAsk: yesSellOrders.length > 0 ? yesSellOrders[0].price : null,
      },
      NO: {
        buy: noBuyOrders,
        sell: noSellOrders,
        bestBid: noBuyOrders.length > 0 ? noBuyOrders[0].price : null,
        bestAsk: noSellOrders.length > 0 ? noSellOrders[0].price : null,
      },
    },
  });
}

async function matchOrders(marketId) {
  // Get all open orders for this market
  const orders = await harperdb.searchByValue(
    "pylomarket",
    "orders",
    "market_id",
    marketId,
    [
      "id",
      "user_id",
      "side",
      "outcome",
      "price",
      "quantity",
      "filled_quantity",
      "status",
    ]
  );

  const ordersList = orders || [];
  const openOrders = ordersList.filter((o) => o.status === "open");

  // Match YES orders
  await matchOrdersForOutcome(openOrders, "YES", marketId);

  // Match NO orders
  await matchOrdersForOutcome(openOrders, "NO", marketId);
}

async function matchOrdersForOutcome(orders, outcome, marketId) {
  const buyOrders = orders
    .filter((o) => o.outcome === outcome && o.side === "buy" && o.status === "open")
    .sort((a, b) => b.price - a.price); // Highest price first

  const sellOrders = orders
    .filter((o) => o.outcome === outcome && o.side === "sell" && o.status === "open")
    .sort((a, b) => a.price - b.price); // Lowest price first

  for (const buyOrder of buyOrders) {
    for (const sellOrder of sellOrders) {
      if (buyOrder.price >= sellOrder.price) {
        // Match found
        const remainingBuy = buyOrder.quantity - buyOrder.filled_quantity;
        const remainingSell = sellOrder.quantity - sellOrder.filled_quantity;
        const tradeQuantity = Math.min(remainingBuy, remainingSell);
        const tradePrice = (buyOrder.price + sellOrder.price) / 2; // Average price

        // Execute trade
        await executeTrade(buyOrder, sellOrder, tradeQuantity, tradePrice, marketId);

        // Update order filled quantities
        buyOrder.filled_quantity += tradeQuantity;
        sellOrder.filled_quantity += tradeQuantity;

        if (buyOrder.filled_quantity >= buyOrder.quantity) {
          buyOrder.status = "filled";
        }
        if (sellOrder.filled_quantity >= sellOrder.quantity) {
          sellOrder.status = "filled";
        }

        await harperdb.update("pylomarket", "orders", [buyOrder, sellOrder]);

        // Break if buy order is filled
        if (buyOrder.status === "filled") {
          break;
        }
      } else {
        // No more matches possible (prices don't overlap)
        break;
      }
    }
  }
}

async function executeTrade(buyOrder, sellOrder, quantity, price, marketId) {
  const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const trade = {
    id: tradeId,
    market_id: marketId,
    buy_order_id: buyOrder.id,
    sell_order_id: sellOrder.id,
    buyer_id: buyOrder.user_id,
    seller_id: sellOrder.user_id,
    outcome: buyOrder.outcome,
    price,
    quantity,
    created_at: new Date().toISOString(),
  };

  await harperdb.insert("pylomarket", "trades", [trade]);

  // Update balances
  const totalCost = quantity * price;

  // Buyer pays for the position
  await updateUserBalance(buyOrder.user_id, -totalCost, "trade");

  // Seller receives payment
  await updateUserBalance(sellOrder.user_id, totalCost, "trade");

  return trade;
}

async function updateUserBalance(userId, amount, type) {
  const balances = await harperdb.searchByValue(
    "pylomarket",
    "balances",
    "user_id",
    userId,
    ["id", "balance"]
  );

  let balance;
  if (!balances || balances.length === 0) {
    const balanceId = `balance_${userId}`;
    balance = {
      id: balanceId,
      user_id: userId,
      balance: 0,
      currency: "USD",
      updated_at: new Date().toISOString(),
    };
    await harperdb.insert("pylomarket", "balances", [balance]);
  } else {
    balance = balances[0];
  }

  balance.balance += amount;
  balance.updated_at = new Date().toISOString();
  await harperdb.update("pylomarket", "balances", [balance]);
}
