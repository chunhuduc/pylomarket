'use server';

/**
 * Wallet Server Actions
 * Replaces WalletResource from resources.js
 */

import { databases } from "harperdb";

const SCHEMA = "pylomarket";

// Extract tables from databases
const { Wallet, Balance, Transaction } = databases.pylomarket;

// Declare global harperdb type (for backward compatibility)
declare global {
  var harperdb: any;
}

async function findFirstByFilter<T>(table: any, filter: Record<string, any>): Promise<T | null> {
  const query = {
    conditions: Object.entries(filter).map(([attribute, value]) => ({ attribute, value })),
    limit: 1,
  };

  for await (const record of table.search(query)) {
    return record as T;
  }
  return null;
}

export async function getWallet(userId: string) {
  try {
    const wallet = await findFirstByFilter<any>(Wallet, { user_id: userId });
    
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    return { success: true, wallet };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBalance(userId: string) {
  try {
    const balance = await findFirstByFilter<any>(Balance, { user_id: userId });

    if (!balance) {
      return { success: false, error: "Balance not found" };
    }

    return { success: true, balance };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBalance(
  userId: string,
  amount: number,
  type: string,
  solanaSignature?: string,
  metadata?: Record<string, any>
) {
  try {
    const balance = await findFirstByFilter<any>(Balance, { user_id: userId });

    if (!balance) {
      return { success: false, error: "Balance not found" };
    }

    const newBalance = balance.balance + amount;

    // Prevent negative balance
    if (newBalance < 0) {
      return { success: false, error: "Insufficient balance" };
    }

    // Update balance
    await (Balance as any).update({
      id: balance.id,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    });

    // Record transaction
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await (Transaction as any).create({
      id: transactionId,
      user_id: userId,
      type,
      amount,
      currency: "SOL",
      status: "completed",
      solana_signature: solanaSignature || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString(),
    });

    return { success: true, balance: newBalance };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Credit balance from a deposit
 */
export async function creditDeposit(
  userId: string,
  amount: number,
  signature: string,
  address: string
) {
  return updateBalance(userId, amount, "deposit", signature, { address });
}

/**
 * Debit balance for a withdrawal
 */
export async function debitWithdrawal(
  userId: string,
  amount: number,
  signature: string,
  toAddress: string
) {
  return updateBalance(userId, -amount, "withdrawal", signature, { toAddress });
}

export async function getTransactions(userId: string, limit: number = 50) {
  try {
    const query = {
      conditions: [{ attribute: 'user_id', value: userId }],
      limit,
    };

    const transactions: any[] = [];
    for await (const record of (Transaction as any).search(query)) {
      transactions.push(record);
    }

    // Sort by created_at descending (most recent first)
    transactions.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });

    return { success: true, transactions: transactions.slice(0, limit) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
