'use server';

/**
 * Orders Server Actions
 * Replaces OrderResource from resources.js
 */

const SCHEMA = "pylomarket";

// Declare global harperdb type
declare global {
  var harperdb: any;
}

export async function placeOrder(data: {
  userId: string;
  marketId: string;
  side: 'buy' | 'sell';
  outcome: string;
  price: number;
  quantity: number;
}) {
  try {
    const { userId, marketId, side, outcome, price, quantity } = data;
    
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

    await harperdb.insert(SCHEMA, "orders", [order]);

    // Try to match orders
    await matchOrders(marketId);

    return { success: true, order };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelOrder(orderId: string, userId: string) {
  try {
    const orders = await harperdb.searchByHash(SCHEMA, "orders", [orderId]);
    
    if (!orders || orders.length === 0) {
      return { success: false, error: "Order not found" };
    }

    const order = orders[0];
    if (order.user_id !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await harperdb.update(SCHEMA, "orders", [{
      id: orderId,
      status: "cancelled",
      updated_at: new Date().toISOString(),
    }]);

    return { success: true, message: "Order cancelled" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getOrders(filters?: {
  userId?: string;
  marketId?: string;
  status?: string;
}) {
  try {
    const { userId, marketId, status } = filters || {};
    
    let query = `SELECT * FROM ${SCHEMA}.orders WHERE 1=1`;
    
    if (userId) {
      query += ` AND user_id = '${userId}'`;
    }
    if (marketId) {
      query += ` AND market_id = '${marketId}'`;
    }
    if (status) {
      query += ` AND status = '${status}'`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const orders = await harperdb.sql(query);
    return { success: true, orders: orders || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getOrderbook(marketId: string) {
  try {
    const orders = await harperdb.searchByValue(
      SCHEMA,
      "orders",
      "market_id",
      marketId
    );

    const openOrders = (orders || []).filter((o: any) => o.status === "open");
    
    const buyOrders = openOrders.filter((o: any) => o.side === "buy").sort((a: any, b: any) => b.price - a.price);
    const sellOrders = openOrders.filter((o: any) => o.side === "sell").sort((a: any, b: any) => a.price - b.price);

    return {
      success: true,
      orderbook: {
        buy: buyOrders,
        sell: sellOrders,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function matchOrders(marketId: string) {
  try {
    const orderbookResult = await getOrderbook(marketId);
    if (!orderbookResult.success) return { success: false, trades: [] };
    
    const buyOrders = orderbookResult.orderbook.buy;
    const sellOrders = orderbookResult.orderbook.sell;

    const trades = [];

    for (const buyOrder of buyOrders) {
      for (const sellOrder of sellOrders) {
        if (buyOrder.outcome === sellOrder.outcome && buyOrder.price >= sellOrder.price) {
          const quantity = Math.min(
            buyOrder.quantity - buyOrder.filled_quantity,
            sellOrder.quantity - sellOrder.filled_quantity
          );
          const price = (buyOrder.price + sellOrder.price) / 2;

          if (quantity > 0) {
            // Create trade
            const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await harperdb.insert(SCHEMA, "trades", [{
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
            }]);

            // Update orders
            const buyFilled = buyOrder.filled_quantity + quantity;
            const sellFilled = sellOrder.filled_quantity + quantity;

            await harperdb.update(SCHEMA, "orders", [
              {
                id: buyOrder.id,
                filled_quantity: buyFilled,
                status: buyFilled >= buyOrder.quantity ? "filled" : "partial",
                updated_at: new Date().toISOString(),
              },
              {
                id: sellOrder.id,
                filled_quantity: sellFilled,
                status: sellFilled >= sellOrder.quantity ? "filled" : "partial",
                updated_at: new Date().toISOString(),
              },
            ]);

            trades.push({ tradeId, quantity, price });
          }
        }
      }
    }

    return { success: true, trades };
  } catch (error: any) {
    return { success: false, error: error.message, trades: [] };
  }
}
