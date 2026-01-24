'use server';

/**
 * Wallet Server Actions
 * Replaces WalletResource from resources.js
 */

const SCHEMA = "pylomarket";

// Declare global harperdb type
declare global {
  var harperdb: any;
}

export async function getWallet(userId: string) {
  try {
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBalance(userId: string) {
  try {
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBalance(userId: string, amount: number, type: string) {
  try {
    const balances = await harperdb.searchByValue(
      SCHEMA,
      "balances",
      "user_id",
      userId
    );

    if (!balances || balances.length === 0) {
      return { success: false, error: "Balance not found" };
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTransactions(userId: string, limit: number = 50) {
  try {
    const query = `SELECT * FROM ${SCHEMA}.transactions WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT ${limit}`;
    const transactions = await harperdb.sql(query);
    return { success: true, transactions: transactions || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
