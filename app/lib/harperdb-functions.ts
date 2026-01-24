/**
 * Helper to call HarperDB Application Resources
 * Resources are defined in resources.js (root level)
 * 
 * Based on HarperDB application template: https://github.com/HarperFast/application-template
 * Documentation: https://docs.harperdb.io/docs/developers/applications
 */

import { HARPERDB_URL } from "./harperdb-connection";

/**
 * Call a HarperDB Resource endpoint
 * Resources automatically generate REST endpoints based on class name
 */
export async function callResource<T = any>(
  resourceName: string,
  method: "GET" | "POST" = "POST",
  data?: any,
  queryParams?: Record<string, string>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    let url = `${HARPERDB_URL}/${resourceName}`;
    
    // Add query params for GET requests
    if (method === "GET" && queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      ...(data && { body: JSON.stringify(data) }),
    });

    // Handle 404 - resource not found
    if (response.status === 404) {
      return {
        success: false,
        error: `Resource '${resourceName}' not found. Make sure HarperDB 4.7 Application is loaded.`,
      };
    }

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || result.message || `Resource call failed with status ${response.status}`,
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

// Legacy function name for backward compatibility (deprecated)
export async function callCustomFunction<T = any>(
  functionName: string,
  operation: string,
  data: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  // Map old custom function names to new Resource names
  const resourceMap: Record<string, string> = {
    auth: "AuthResource",
    wallet: "WalletResource",
    markets: "MarketResource",
    orderbook: "OrderResource",
    solana_poll: "SolanaResource",
  };

  const resourceName = resourceMap[functionName] || functionName;
  
  // Convert operation to action format
  return callResource<T>(resourceName, "POST", {
    action: operation,
    ...data,
  });
}

// Convenience functions for each Resource
export const authFunctions = {
  register: (data: { email: string; password: string; username: string }) =>
    callResource("AuthResource", "POST", { action: "register", ...data }),
  login: (data: { email: string; password: string }) =>
    callResource("AuthResource", "POST", { action: "login", ...data }),
  verifyToken: (token: string) =>
    callResource("AuthResource", "GET", undefined, { token }),
};

export const walletFunctions = {
  createWallet: (data: { userId: string; solanaAddress: string }) =>
    callResource("WalletResource", "POST", { action: "create_wallet", ...data }),
  getWallet: (userId: string) =>
    callResource("WalletResource", "POST", { action: "get_wallet", userId }),
  getBalance: (userId: string) =>
    callResource("WalletResource", "POST", { action: "get_balance", userId }),
  updateBalance: (data: { userId: string; amount: number; type: string }) =>
    callResource("WalletResource", "POST", { action: "update_balance", ...data }),
  getTransactions: (userId: string, limit?: number) =>
    callResource("WalletResource", "POST", { action: "get_transactions", userId, limit }),
};

export const marketFunctions = {
  createMarket: (data: { title: string; description: string; category?: string; endDate: string }) =>
    callResource("MarketResource", "POST", { action: "create_market", ...data }),
  listMarkets: (data?: { category?: string; resolved?: boolean; limit?: number; offset?: number }) =>
    callResource("MarketResource", "POST", { action: "list_markets", ...(data || {}) }),
  getMarket: (marketId: string) =>
    callResource("MarketResource", "POST", { action: "get_market", marketId }),
  resolveMarket: (data: { marketId: string; resolution: string }) =>
    callResource("MarketResource", "POST", { action: "resolve_market", ...data }),
};

export const orderbookFunctions = {
  placeOrder: (data: { userId: string; marketId: string; side: string; outcome: string; price: number; quantity: number }) =>
    callResource("OrderResource", "POST", { action: "place_order", ...data }),
  cancelOrder: (data: { orderId: string; userId: string }) =>
    callResource("OrderResource", "POST", { action: "cancel_order", ...data }),
  getOrders: (data?: { userId?: string; marketId?: string; status?: string }) =>
    callResource("OrderResource", "POST", { action: "get_orders", ...(data || {}) }),
  getOrderbook: (marketId: string) =>
    callResource("OrderResource", "POST", { action: "get_orderbook", marketId }),
  matchOrders: (marketId: string) =>
    callResource("OrderResource", "POST", { action: "match_orders", marketId }),
};

export const solanaFunctions = {
  pollDeposits: (data: { address: string }) =>
    callResource("SolanaResource", "POST", { action: "poll_deposits", ...data }),
  pollUserDeposits: (userId: string) =>
    callResource("SolanaResource", "POST", { action: "poll_user_deposits", userId }),
};
