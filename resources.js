/**
 * PyloMarket HarperDB Application Resources
 * 
 * This file contains Resource classes that extend tables with custom logic.
 * Resources automatically generate REST endpoints.
 * 
 * Based on HarperDB application template: https://github.com/HarperFast/application-template
 * Documentation: https://docs.harperdb.io/docs/developers/applications
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Connection, PublicKey } = require("@solana/web3.js");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const solanaConnection = new Connection(SOLANA_RPC_URL, "confirmed");
const SCHEMA = "pylomarket";

/**
 * Authentication Resource
 * Handles user registration, login, and JWT token verification
 * 
 * Endpoints:
 * - POST /AuthResource (action: 'register' | 'login')
 * - GET /AuthResource?token=... (verify token)
 */
class AuthResource extends Resource {
  static loadAsInstance = false;

  async post(target, data) {
    const { action, email, password, username } = data;
    
    if (action === "register") {
      return await this.registerUser({ email, password, username });
    } else if (action === "login") {
      return await this.loginUser({ email, password });
    } else {
      throw new Error("Invalid action. Use 'register' or 'login'");
    }
  }

  async get(target) {
    const token = target.query?.token;
    if (!token) {
      throw new Error("Token required");
    }
    return await this.verifyToken(token);
  }

  async registerUser({ email, password, username }) {
    // Check if user exists
    const existingUsers = await harperdb.searchByValue(
      SCHEMA,
      "users",
      "email",
      email
    );

    if (existingUsers && existingUsers.length > 0) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id: userId,
      email,
      username,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await harperdb.insert(SCHEMA, "users", [user]);

    // Create wallet and balance
    const walletId = `wallet_${userId}`;
    await harperdb.insert(SCHEMA, "wallets", [{
      id: walletId,
      user_id: userId,
      solana_address: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);

    await harperdb.insert(SCHEMA, "balances", [{
      id: `balance_${userId}`,
      user_id: userId,
      balance: 0,
      currency: "USD",
      updated_at: new Date().toISOString(),
    }]);

    return { success: true, userId, message: "User registered successfully" };
  }

  async loginUser({ email, password }) {
    const users = await harperdb.searchByValue(
      SCHEMA,
      "users",
      "email",
      email
    );

    if (!users || users.length === 0) {
      throw new Error("Invalid credentials");
    }

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { success: true, user: decoded };
    } catch (error) {
      throw new Error("Invalid token");
    }
  }
}

/**
 * Wallet Resource
 * Handles wallet operations and balance management
 */
class WalletResource extends Resource {
  static loadAsInstance = false;

  async post(target, data) {
    const { action } = data;

    switch (action) {
      case "create_wallet":
        return await this.createWallet(data);
      case "get_wallet":
        return await this.getWallet(data.userId);
      case "get_balance":
        return await this.getBalance(data.userId);
      case "update_balance":
        return await this.updateBalance(data);
      case "get_transactions":
        return await this.getTransactions(data.userId, data.limit);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async createWallet({ userId, solanaAddress }) {
    const walletId = `wallet_${userId}`;
    const wallet = {
      id: walletId,
      user_id: userId,
      solana_address: solanaAddress,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await harperdb.insert(SCHEMA, "wallets", [wallet]);
    return { success: true, wallet };
  }

  async getWallet(userId) {
    const wallets = await harperdb.searchByValue(
      SCHEMA,
      "wallets",
      "user_id",
      userId
    );

    if (!wallets || wallets.length === 0) {
      return { success: false, error: "Wallet not found" };
    }

    return { success: true, wallet: wallets[0] };
  }

  async getBalance(userId) {
    const balances = await harperdb.searchByValue(
      SCHEMA,
      "balances",
      "user_id",
      userId
    );

    if (!balances || balances.length === 0) {
      return { success: false, error: "Balance not found" };
    }

    return { success: true, balance: balances[0] };
  }

  async updateBalance({ userId, amount, type }) {
    const balances = await harperdb.searchByValue(
      SCHEMA,
      "balances",
      "user_id",
      userId
    );

    if (!balances || balances.length === 0) {
      throw new Error("Balance not found");
    }

    const balance = balances[0];
    const newBalance = balance.balance + amount;

    await harperdb.update(SCHEMA, "balances", [{
      id: balance.id,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    }]);

    // Record transaction
    await harperdb.insert(SCHEMA, "transactions", [{
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type,
      amount,
      currency: "USD",
      status: "completed",
      created_at: new Date().toISOString(),
    }]);

    return { success: true, balance: newBalance };
  }

  async getTransactions(userId, limit = 50) {
    const query = `SELECT * FROM ${SCHEMA}.transactions WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT ${limit}`;
    const transactions = await harperdb.sql(query);
    return { success: true, transactions: transactions || [] };
  }
}

/**
 * Market Resource
 * Handles prediction market operations
 */
class MarketResource extends Resource {
  static loadAsInstance = false;

  async post(target, data) {
    const { action } = data;

    switch (action) {
      case "create_market":
        return await this.createMarket(data);
      case "list_markets":
        return await this.listMarkets(data);
      case "get_market":
        return await this.getMarket(data.marketId);
      case "resolve_market":
        return await this.resolveMarket(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async createMarket({ title, description, category, endDate }) {
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
  }

  async listMarkets({ category, resolved, limit = 50, offset = 0 }) {
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
  }

  async getMarket(marketId) {
    const markets = await harperdb.searchByHash(
      SCHEMA,
      "markets",
      [marketId]
    );

    if (!markets || markets.length === 0) {
      return { success: false, error: "Market not found" };
    }

    return { success: true, market: markets[0] };
  }

  async resolveMarket({ marketId, resolution }) {
    const markets = await harperdb.searchByHash(
      SCHEMA,
      "markets",
      [marketId]
    );

    if (!markets || markets.length === 0) {
      throw new Error("Market not found");
    }

    await harperdb.update(SCHEMA, "markets", [{
      id: marketId,
      resolved: true,
      resolution,
      updated_at: new Date().toISOString(),
    }]);

    return { success: true, message: "Market resolved" };
  }
}

/**
 * Order Resource
 * Handles order book operations
 */
class OrderResource extends Resource {
  static loadAsInstance = false;

  async post(target, data) {
    const { action } = data;

    switch (action) {
      case "place_order":
        return await this.placeOrder(data);
      case "cancel_order":
        return await this.cancelOrder(data);
      case "get_orders":
        return await this.getOrders(data);
      case "get_orderbook":
        return await this.getOrderbook(data.marketId);
      case "match_orders":
        return await this.matchOrders(data.marketId);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async placeOrder({ userId, marketId, side, outcome, price, quantity }) {
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
    await this.matchOrders(marketId);

    return { success: true, order };
  }

  async cancelOrder({ orderId, userId }) {
    const orders = await harperdb.searchByHash(SCHEMA, "orders", [orderId]);
    
    if (!orders || orders.length === 0) {
      throw new Error("Order not found");
    }

    const order = orders[0];
    if (order.user_id !== userId) {
      throw new Error("Unauthorized");
    }

    await harperdb.update(SCHEMA, "orders", [{
      id: orderId,
      status: "cancelled",
      updated_at: new Date().toISOString(),
    }]);

    return { success: true, message: "Order cancelled" };
  }

  async getOrders({ userId, marketId, status }) {
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
  }

  async getOrderbook(marketId) {
    const orders = await harperdb.searchByValue(
      SCHEMA,
      "orders",
      "market_id",
      marketId
    );

    const openOrders = (orders || []).filter(o => o.status === "open");
    
    const buyOrders = openOrders.filter(o => o.side === "buy").sort((a, b) => b.price - a.price);
    const sellOrders = openOrders.filter(o => o.side === "sell").sort((a, b) => a.price - b.price);

    return {
      success: true,
      orderbook: {
        buy: buyOrders,
        sell: sellOrders,
      },
    };
  }

  async matchOrders(marketId) {
    const orderbook = await this.getOrderbook(marketId);
    const buyOrders = orderbook.orderbook.buy;
    const sellOrders = orderbook.orderbook.sell;

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
  }
}

/**
 * Solana Resource
 * Handles Solana deposit polling
 */
class SolanaResource extends Resource {
  static loadAsInstance = false;

  async post(target, data) {
    const { action } = data;

    switch (action) {
      case "poll_deposits":
        return await this.pollDeposits(data);
      case "poll_user_deposits":
        return await this.pollUserDeposits(data.userId);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async pollDeposits({ address }) {
    try {
      const publicKey = new PublicKey(address);
      const balance = await solanaConnection.getBalance(publicKey);
      const balanceSOL = balance / 1e9;

      // Check for new transactions
      const signatures = await solanaConnection.getSignaturesForAddress(publicKey, { limit: 10 });
      
      return {
        success: true,
        address,
        balance: balanceSOL,
        signatures: signatures.map(sig => ({
          signature: sig.signature,
          blockTime: sig.blockTime,
          confirmationStatus: sig.confirmationStatus,
        })),
      };
    } catch (error) {
      throw new Error(`Solana polling error: ${error.message}`);
    }
  }

  async pollUserDeposits(userId) {
    const wallets = await harperdb.searchByValue(
      SCHEMA,
      "wallets",
      "user_id",
      userId
    );

    if (!wallets || wallets.length === 0) {
      return { success: false, error: "Wallet not found" };
    }

    return await this.pollDeposits({ address: wallets[0].solana_address });
  }
}

// Export resources for HarperDB
module.exports = {
  AuthResource,
  WalletResource,
  MarketResource,
  OrderResource,
  SolanaResource,
};
