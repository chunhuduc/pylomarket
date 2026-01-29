'use server';

/**
 * Wallet Server Actions
 * Replaces WalletResource from resources.js
 */

import { databases } from "harperdb";
import { generateSolanaWallet } from './solana';
import { encrypt } from '../lib/encryption';
import { checkNewDeposits } from './solana';
import { sendSOL } from './solana';
import { requireAuth } from '../lib/auth';

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

/**
 * Internal function to get wallet by userId
 * Used by other server-side functions
 */
async function getWalletByUserId(userId: string) {
  try {
    const wallet = await findFirstByFilter<any>(Wallet, { user_id: userId });
    
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    // Convert HarperDB object to plain object (required for Server Actions)
    const plainWallet = {
      id: wallet.id,
      user_id: wallet.user_id,
      solana_address: wallet.solana_address,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    };

    return { success: true, wallet: plainWallet };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get wallet for current authenticated user
 * Uses HttpOnly cookie for authentication
 */
export async function getWallet() {
  try {
    const user = await requireAuth();
    return await getWalletByUserId(user.userId);
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication required' };
  }
}

/**
 * Get wallet by userId (for internal use)
 * @deprecated Use getWallet() with requireAuth() instead
 */
export async function getWalletWithUserId(userId: string) {
  return getWalletByUserId(userId);
}

/**
 * Internal function to create wallet by userId
 * Used by other server-side functions
 */
async function createWalletByUserId(userId: string) {
  try {
    // Check if wallet already exists
    const existingWallet = await findFirstByFilter<any>(Wallet, { user_id: userId });
    if (existingWallet) {
      return { success: false, error: "Wallet already exists" };
    }

    // Generate Solana wallet (includes private key)
    const { address: solanaAddress, privateKey } = await generateSolanaWallet();

    // Encrypt private key before storing
    const encryptedPrivateKey = encrypt(privateKey);

    // Create wallet with encrypted private key
    const walletId = `wallet_${userId}`;
    await (Wallet as any).create({
      id: walletId,
      user_id: userId,
      solana_address: solanaAddress,
      encrypted_private_key: encryptedPrivateKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Create balance
    const balanceId = `balance_${userId}`;
    await (Balance as any).create({
      id: balanceId,
      user_id: userId,
      balance: 0,
      currency: "SOL",
      updated_at: new Date().toISOString(),
    });

    // Get the created wallet (without exposing private key)
    const wallet = await findFirstByFilter<any>(Wallet, { user_id: userId });
    // Convert HarperDB object to plain object (required for Server Actions)
    if (wallet) {
      const plainWallet = {
        id: wallet.id,
        user_id: wallet.user_id,
        solana_address: wallet.solana_address,
        created_at: wallet.created_at,
        updated_at: wallet.updated_at,
      };
      return { success: true, wallet: plainWallet };
    }
    
    return { success: true, wallet: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create wallet for current authenticated user
 * Uses HttpOnly cookie for authentication
 */
export async function createWallet() {
  try {
    const user = await requireAuth();
    return await createWalletByUserId(user.userId);
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication required' };
  }
}

/**
 * Create wallet by userId (for internal use)
 * @deprecated Use createWallet() with requireAuth() instead
 */
export async function createWalletWithUserId(userId: string) {
  return createWalletByUserId(userId);
}

/**
 * Ensure wallet exists for user - automatically creates if not exists
 * This is called during login to ensure every user has a wallet
 */
export async function ensureWalletExists(userId: string) {
  try {
    // Check if wallet exists
    const existingWallet = await findFirstByFilter<any>(Wallet, { user_id: userId });
    
    if (existingWallet) {
      // Convert HarperDB object to plain object (required for Server Actions)
      const plainWallet = {
        id: existingWallet.id,
        user_id: existingWallet.user_id,
        solana_address: existingWallet.solana_address,
        created_at: existingWallet.created_at,
        updated_at: existingWallet.updated_at,
      };
      return { success: true, wallet: plainWallet, created: false };
    }

    // Wallet doesn't exist, create it
    const createResult = await createWalletByUserId(userId);
    
    if (!createResult.success) {
      return { success: false, error: createResult.error };
    }

    // Return the wallet from createResult (already converted to plain object)
    return { 
      success: true, 
      wallet: createResult.wallet, 
      created: true 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Internal function to get balance by userId
 * Used by other server-side functions
 */
async function getBalanceByUserId(userId: string) {
  try {
    const balance = await findFirstByFilter<any>(Balance, { user_id: userId });

    if (!balance) {
      return { success: false, error: "Balance not found" };
    }

    // Convert HarperDB object to plain object (required for Server Actions)
    const plainBalance = {
      id: balance.id,
      user_id: balance.user_id,
      balance: balance.balance,
      currency: balance.currency,
      updated_at: balance.updated_at,
    };

    return { success: true, balance: plainBalance };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get balance for current authenticated user
 * Uses HttpOnly cookie for authentication
 */
export async function getBalance() {
  try {
    const user = await requireAuth();
    return await getBalanceByUserId(user.userId);
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication required' };
  }
}

/**
 * Get balance by userId (for internal use)
 * @deprecated Use getBalance() with requireAuth() instead
 */
export async function getBalanceWithUserId(userId: string) {
  return getBalanceByUserId(userId);
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

/**
 * Internal function to get transactions by userId
 * Used by other server-side functions
 */
async function getTransactionsByUserId(userId: string, limit: number = 50) {
  try {
    const query = {
      conditions: [{ attribute: 'user_id', value: userId }],
      limit,
    };

    const transactions: any[] = [];
    for await (const record of (Transaction as any).search(query)) {
      // Convert HarperDB object to plain object (required for Server Actions)
      transactions.push({
        id: record.id,
        user_id: record.user_id,
        type: record.type,
        amount: record.amount,
        currency: record.currency,
        status: record.status,
        solana_signature: record.solana_signature,
        metadata: record.metadata,
        created_at: record.created_at,
      });
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

/**
 * Get transactions for current authenticated user
 * Uses HttpOnly cookie for authentication
 */
export async function getTransactions(limit: number = 50) {
  try {
    const user = await requireAuth();
    return await getTransactionsByUserId(user.userId, limit);
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication required' };
  }
}

/**
 * Get transactions by userId (for internal use)
 * @deprecated Use getTransactions() with requireAuth() instead
 */
export async function getTransactionsWithUserId(userId: string, limit: number = 50) {
  return getTransactionsByUserId(userId, limit);
}




/**
 * Check for new deposits for current authenticated user
 * Uses HttpOnly cookie for authentication
 */
export async function checkDeposits() {
  try {
    const user = await requireAuth();
    
    // Get user's wallet
    const walletResult = await getWalletByUserId(user.userId);
    if (!walletResult.success || !walletResult.wallet?.solana_address) {
      return { success: false, error: "Wallet not found" };
    }

    const address = walletResult.wallet.solana_address;

    // Get all deposit transactions to check for duplicates
    const transactionsResult = await getTransactionsByUserId(user.userId, 100);
    const processedSignatures = new Set(
      transactionsResult.success && transactionsResult.transactions
        ? transactionsResult.transactions
            .filter(tx => tx.type === 'deposit' && tx.solana_signature)
            .map(tx => tx.solana_signature)
        : []
    );

    // Get last processed transaction signature for optimization
    const lastTransaction = transactionsResult.success && transactionsResult.transactions && transactionsResult.transactions.length > 0
      ? transactionsResult.transactions.find(tx => tx.type === 'deposit' && tx.solana_signature)
      : null;
    const lastProcessedSignature = lastTransaction?.solana_signature || undefined;

    // Check for new deposits
    const depositsResult = await checkNewDeposits(address, lastProcessedSignature);

    if (!depositsResult.success) {
      return {
        success: false,
        error: depositsResult.error || "Failed to check deposits",
      };
    }

    const newDeposits = depositsResult.newDeposits || [];
    let creditedCount = 0;
    const errors: string[] = [];

    // Credit each new deposit
    for (const deposit of newDeposits) {
      // Skip if already processed
      if (processedSignatures.has(deposit.signature)) {
        continue;
      }

      // Credit the deposit
      const creditResult = await creditDeposit(
        user.userId,
        deposit.amount,
        deposit.signature,
        address
      );

      if (creditResult.success) {
        creditedCount++;
      } else {
        errors.push(`Failed to credit deposit ${deposit.signature}: ${creditResult.error}`);
      }
    }

    return {
      success: true,
      newDepositsFound: newDeposits.length,
      creditedCount,
      deposits: newDeposits,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication required' };
  }
}


/**
 * Withdraw SOL for current authenticated user
 * Uses HttpOnly cookie for authentication
 */
export async function withdraw(toAddress: string, amount: number) {
  try {
    const user = await requireAuth();

    // Validate input
    if (!toAddress || typeof toAddress !== 'string') {
      return { success: false, error: "Invalid withdrawal address" };
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return { success: false, error: "Invalid amount. Must be greater than 0" };
    }

    // Check minimum withdrawal (e.g., 0.01 SOL)
    const MIN_WITHDRAWAL = 0.01;
    if (amount < MIN_WITHDRAWAL) {
      return { success: false, error: `Minimum withdrawal amount is ${MIN_WITHDRAWAL} SOL` };
    }

    // Check user balance
    const balanceResult = await getBalanceByUserId(user.userId);
    if (!balanceResult.success || !balanceResult.balance) {
      return { success: false, error: "Balance not found. Please create a wallet first." };
    }

    const currentBalance = balanceResult.balance?.balance || 0;
    if (currentBalance < amount) {
      return { success: false, error: "Insufficient balance" };
    }

    // Send SOL from hot wallet
    const sendResult = await sendSOL(toAddress, amount);

    if (!sendResult.success) {
      return { success: false, error: sendResult.error || "Failed to send SOL" };
    }

    // Debit user balance
    if (!sendResult.signature) {
      return { success: false, error: "Transaction signature not found" };
    }

    const debitResult = await debitWithdrawal(
      user.userId,
      amount,
      sendResult.signature,
      toAddress
    );

    if (!debitResult.success) {
      // If debit fails, we should ideally reverse the SOL send
      // For now, just return error (in production, implement proper rollback)
      return { success: false, error: "Withdrawal sent but failed to update balance. Please contact support." };
    }

    return {
      success: true,
      signature: sendResult.signature,
      newBalance: debitResult.balance,
      message: "Withdrawal successful",
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication required' };
  }
}
