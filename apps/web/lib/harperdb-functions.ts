/**
 * Helper to call HarperDB custom functions
 * These functions are auto-deployed from custom_functions/ folder
 */

const HARPERDB_URL = process.env.HARPERDB_URL || process.env.NEXT_PUBLIC_HARPERDB_URL || "http://localhost:9925";

export async function callCustomFunction<T = any>(
  functionName: string,
  operation: string,
  data: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`${HARPERDB_URL}/custom_function/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operation,
        data,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Custom function call failed",
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Convenience functions for each custom function
export const authFunctions = {
  register: (data: { email: string; password: string; username: string }) =>
    callCustomFunction("auth", "register", data),
  login: (data: { email: string; password: string }) =>
    callCustomFunction("auth", "login", data),
  verifyToken: (token: string) =>
    callCustomFunction("auth", "verify_token", { token }),
};

export const walletFunctions = {
  createWallet: (data: { userId: string; solanaAddress: string }) =>
    callCustomFunction("wallet", "create_wallet", data),
  getWallet: (userId: string) =>
    callCustomFunction("wallet", "get_wallet", { userId }),
  getBalance: (userId: string) =>
    callCustomFunction("wallet", "get_balance", { userId }),
  updateBalance: (data: { userId: string; amount: number; type: string }) =>
    callCustomFunction("wallet", "update_balance", data),
  getTransactions: (userId: string, limit?: number) =>
    callCustomFunction("wallet", "get_transactions", { userId, limit }),
};

export const marketFunctions = {
  createMarket: (data: { title: string; description: string; category?: string; endDate: string }) =>
    callCustomFunction("markets", "create_market", data),
  listMarkets: (data?: { category?: string; resolved?: boolean; limit?: number; offset?: number }) =>
    callCustomFunction("markets", "list_markets", data || {}),
  getMarket: (marketId: string) =>
    callCustomFunction("markets", "get_market", { marketId }),
  resolveMarket: (data: { marketId: string; resolution: string }) =>
    callCustomFunction("markets", "resolve_market", data),
};

export const orderbookFunctions = {
  placeOrder: (data: { userId: string; marketId: string; side: string; outcome: string; price: number; quantity: number }) =>
    callCustomFunction("orderbook", "place_order", data),
  cancelOrder: (data: { orderId: string; userId: string }) =>
    callCustomFunction("orderbook", "cancel_order", data),
  getOrders: (data?: { userId?: string; marketId?: string; status?: string }) =>
    callCustomFunction("orderbook", "get_orders", data || {}),
  getOrderbook: (marketId: string) =>
    callCustomFunction("orderbook", "get_orderbook", { marketId }),
  matchOrders: (marketId: string) =>
    callCustomFunction("orderbook", "match_orders", { marketId }),
};

export const solanaFunctions = {
  pollDeposits: (data: { address: string }) =>
    callCustomFunction("solana_poll", "poll_deposits", data),
  pollUserDeposits: (userId: string) =>
    callCustomFunction("solana_poll", "poll_user_deposits", { userId }),
};
