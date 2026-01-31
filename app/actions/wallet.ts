'use server';

/**
 * Wallet Server Actions
 * Replaces WalletResource from resources.js
 */

import { databases } from "harperdb";
import { generateSolanaWallet } from './solana';
import { encrypt, decrypt } from '../lib/encryption';
import { checkNewDeposits } from './solana';
import { sendSOL } from './solana';
import { requireAuth } from '../lib/auth';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SCHEMA = "pylomarket";

// Extract tables from databases
const { Wallet, Transaction } = databases.pylomarket;

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

async function findAllByFilter<T>(table: any, filter: Record<string, any>): Promise<T[]> {
  const query = {
    conditions: Object.entries(filter).map(([attribute, value]) => ({ attribute, value })),
    limit: 100,
  };

  const results: T[] = [];
  for await (const record of table.search(query)) {
    results.push(record as T);
  }
  return results;
}

/**
 * Internal function to get primary wallet by userId
 * Used by other server-side functions
 */
async function getWalletByUserId(userId: string) {
  try {
    const wallets = await findAllByFilter<any>(Wallet, { user_id: userId });
    
    if (wallets.length === 0) {
      return { success: false, error: "Wallet not found" };
    }

    // Find primary wallet, or fallback to first wallet if no primary set
    let wallet = wallets.find((w: any) => w.is_primary === true);
    if (!wallet) {
      wallet = wallets[0];
    }

    // Convert HarperDB object to plain object (required for Server Actions)
    const plainWallet = {
      id: wallet.id,
      user_id: wallet.user_id,
      solana_address: wallet.solana_address,
      key_exported: wallet.key_exported || false,
      key_management_mode: wallet.key_management_mode || 'app-managed',
      wallet_source: wallet.wallet_source || 'system-generated',
      is_primary: wallet.is_primary || false,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    };

    return { success: true, wallet: plainWallet };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all wallets for a user
 */
async function getAllWalletsByUserId(userId: string) {
  try {
    const wallets = await findAllByFilter<any>(Wallet, { user_id: userId });
    
    const plainWallets = wallets.map(wallet => ({
      id: wallet.id,
      user_id: wallet.user_id,
      solana_address: wallet.solana_address,
      key_exported: wallet.key_exported || false,
      key_management_mode: wallet.key_management_mode || 'app-managed',
      wallet_source: wallet.wallet_source || 'system-generated',
      is_primary: wallet.is_primary || false,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    }));

    return { success: true, wallets: plainWallets };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get wallet count for a user
 */
async function getWalletCountByUserId(userId: string): Promise<number> {
  try {
    const wallets = await findAllByFilter<any>(Wallet, { user_id: userId });
    return wallets.length;
  } catch (error: any) {
    return 0;
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
    // Check wallet count (max 2 wallets)
    const walletCount = await getWalletCountByUserId(userId);
    if (walletCount >= 2) {
      return { success: false, error: "Maximum 2 wallets allowed. Please delete an existing wallet first." };
    }

    // Check if this will be the first wallet (set as primary)
    const isFirstWallet = walletCount === 0;

    // Generate Solana wallet (includes private key)
    const { address: solanaAddress, privateKey } = await generateSolanaWallet();

    // Encrypt private key before storing
    const encryptedPrivateKey = encrypt(privateKey);

    // Create wallet with encrypted private key
    const walletId = `wallet_${userId}_${Date.now()}`;
    await (Wallet as any).create({
      id: walletId,
      user_id: userId,
      solana_address: solanaAddress,
      encrypted_private_key: encryptedPrivateKey,
      key_exported: false,
      key_management_mode: 'app-managed',
      wallet_source: 'system-generated',
      is_primary: isFirstWallet, // Set as primary if first wallet
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Balance is managed on blockchain, no need to create balance record

    // Get the created wallet by ID (without exposing private key)
    const wallet = await findFirstByFilter<any>(Wallet, { id: walletId });
    // Convert HarperDB object to plain object (required for Server Actions)
    if (wallet) {
      const plainWallet = {
        id: wallet.id,
        user_id: wallet.user_id,
        solana_address: wallet.solana_address,
        key_exported: wallet.key_exported || false,
        key_management_mode: wallet.key_management_mode || 'app-managed',
        wallet_source: wallet.wallet_source || 'system-generated',
        is_primary: wallet.is_primary || false,
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
 * This is called during login to ensure every user has at least 1 wallet
 * Note: Users can now have 0-2 wallets, but we ensure at least 1 exists on login
 */
export async function ensureWalletExists(userId: string) {
  try {
    // Check if any active wallet exists
    const wallets = await findAllByFilter<any>(Wallet, { user_id: userId });
    
    if (wallets.length > 0) {
      // Find primary wallet, or fallback to first wallet if no primary set
      let existingWallet = wallets.find((w: any) => w.is_primary === true);
      if (!existingWallet) {
        existingWallet = wallets[0];
      }
      const plainWallet = {
        id: existingWallet.id,
        user_id: existingWallet.user_id,
        solana_address: existingWallet.solana_address,
        key_exported: existingWallet.key_exported || false,
        key_management_mode: existingWallet.key_management_mode || 'app-managed',
        wallet_source: existingWallet.wallet_source || 'system-generated',
        is_primary: existingWallet.is_primary || false,
        created_at: existingWallet.created_at,
        updated_at: existingWallet.updated_at,
      };
      return { success: true, wallet: plainWallet, created: false };
    }

    // No wallet exists, create one (user must have at least 1 wallet)
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
 * Queries balance directly from Solana blockchain
 */
async function getBalanceByUserId(userId: string) {
  try {
    // Get primary wallet for user
    const walletResult = await getWalletByUserId(userId);
    if (!walletResult.success || !walletResult.wallet) {
      return { success: false, error: "Wallet not found. Please create a wallet first." };
    }

    const solanaAddress = walletResult.wallet.solana_address;
    if (!solanaAddress) {
      return { success: false, error: "Wallet address not found" };
    }

    // Query balance from Solana blockchain
    const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const publicKey = new PublicKey(solanaAddress);
    const balanceLamports = await connection.getBalance(publicKey);
    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;

    // Return balance in same format as before for compatibility
    const plainBalance = {
      id: `balance_${userId}`, // Virtual ID for compatibility
      user_id: userId,
      balance: balanceSOL,
      currency: "SOL",
      updated_at: new Date().toISOString(),
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


/**
 * Record a transaction (balance is managed on blockchain, we only record transactions)
 */
async function recordTransaction(
  userId: string,
  type: string,
  amount: number,
  solanaSignature?: string,
  metadata?: Record<string, any>
) {
  try {
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

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Record a deposit transaction
 */
export async function creditDeposit(
  userId: string,
  amount: number,
  signature: string,
  address: string
) {
  return recordTransaction(userId, "deposit", amount, signature, { address });
}

/**
 * Record a withdrawal transaction
 */
export async function debitWithdrawal(
  userId: string,
  amount: number,
  signature: string,
  toAddress: string
) {
  return recordTransaction(userId, "withdrawal", amount, signature, { toAddress });
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
    
    // Get user's primary wallet
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

    // Check user balance from blockchain
    const balanceResult = await getBalanceByUserId(user.userId);
    if (!balanceResult.success || !balanceResult.balance) {
      return { success: false, error: balanceResult.error || "Failed to get balance. Please create a wallet first." };
    }

    const currentBalance = balanceResult.balance?.balance || 0;
    if (currentBalance < amount) {
      return { success: false, error: `Insufficient balance. Available: ${currentBalance} SOL, Required: ${amount} SOL` };
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

    // Record withdrawal transaction
    const debitResult = await debitWithdrawal(
      user.userId,
      amount,
      sendResult.signature,
      toAddress
    );

    if (!debitResult.success) {
      // Transaction was sent but failed to record - log for manual review
      console.error(`Withdrawal sent but failed to record transaction: ${sendResult.signature}`);
      // Still return success since SOL was sent
    }

    // Get updated balance from blockchain
    const updatedBalanceResult = await getBalanceByUserId(user.userId);
    const newBalance = updatedBalanceResult.success ? updatedBalanceResult.balance?.balance || 0 : currentBalance - amount;

    return {
      success: true,
      signature: sendResult.signature,
      newBalance,
      message: "Withdrawal successful",
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication required' };
  }
}

/**
 * Export private key for a specific wallet
 * Decrypts and returns the private key (user should download and store securely)
 * Uses HttpOnly cookie for authentication
 */
export async function exportPrivateKey(walletId: string) {
  try {
    const user = await requireAuth();
    
    // Get specific wallet
    const wallet = await findFirstByFilter<any>(Wallet, { id: walletId, user_id: user.userId });
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    // Check if encrypted_private_key exists
    if (!wallet.encrypted_private_key) {
      return { 
        success: false, 
        error: "Private key not found. This wallet may have been created before encryption was implemented, or the key was already exported and removed." 
      };
    }

    // Validate encrypted_private_key format (should be base64 string)
    if (typeof wallet.encrypted_private_key !== 'string' || wallet.encrypted_private_key.trim() === '') {
      return { 
        success: false, 
        error: "Invalid private key format. The encrypted key appears to be corrupted." 
      };
    }

    // Check if wallet is already self-managed (key should have been removed)
    if (wallet.key_management_mode === 'self-managed') {
      return { 
        success: false, 
        error: "This wallet is self-managed. The private key is no longer stored by the app. Please use your exported private key." 
      };
    }

    try {
      // Decrypt private key
      const privateKey = decrypt(wallet.encrypted_private_key);
      
      // Validate decrypted key is not empty
      if (!privateKey || privateKey.trim() === '') {
        return { 
          success: false, 
          error: "Decryption succeeded but returned empty key. This may indicate a corrupted encrypted key." 
        };
      }

      return { 
        success: true, 
        privateKey,
        address: wallet.solana_address,
        warning: "Keep this private key secure. Anyone with access to it can control your wallet."
      };
    } catch (decryptError: any) {
      // More detailed error message
      const errorMessage = decryptError.message || 'Unknown decryption error';
      
      // Check if it's an authentication error (wrong key)
      if (errorMessage.includes('unable to authenticate') || errorMessage.includes('Unsupported state')) {
        return { 
          success: false, 
          error: `Decryption failed: The encryption key may have changed, or the encrypted data is corrupted. Original error: ${errorMessage}` 
        };
      }
      
      return { 
        success: false, 
        error: `Failed to decrypt private key: ${errorMessage}` 
      };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to export private key' };
  }
}

/**
 * Mark private key as exported and change to self-managed
 * When exported, wallet_source becomes 'external-like' (treated like external wallet)
 * Uses HttpOnly cookie for authentication
 */
export async function markKeyAsExported(walletId: string) {
  try {
    const user = await requireAuth();
    const wallet = await findFirstByFilter<any>(Wallet, { id: walletId, user_id: user.userId });
    
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    // Update wallet - mark as self-managed and external-like
    await (Wallet as any).update({
      id: wallet.id,
      key_exported: true,
      key_management_mode: 'self-managed',
      wallet_source: 'external-like', // Treat as external wallet after export
      updated_at: new Date().toISOString(),
    });

    return { 
      success: true,
      message: "Wallet is now self-managed. App will no longer store your private key."
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update wallet' };
  }
}

/**
 * Get all wallets for current authenticated user
 * Uses HttpOnly cookie for authentication
 */
export async function getAllWallets() {
  try {
    const user = await requireAuth();
    return await getAllWalletsByUserId(user.userId);
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication required' };
  }
}

/**
 * Add external wallet (wallet address only, no private key)
 * Uses HttpOnly cookie for authentication
 */
export async function addExternalWallet(address: string) {
  try {
    const user = await requireAuth();
    
    // Validate address
    if (!address || address.trim() === '') {
      return { success: false, error: "Address is required" };
    }

    // Validate Solana address format (basic check)
    if (address.length < 32 || address.length > 44) {
      return { success: false, error: "Invalid Solana address format" };
    }

    // Check wallet count (max 2 wallets)
    const walletCount = await getWalletCountByUserId(user.userId);
    if (walletCount >= 2) {
      return { success: false, error: "Maximum 2 wallets allowed. Please delete an existing wallet first." };
    }

    // Check if address already exists
    const existingWallet = await findFirstByFilter<any>(Wallet, { 
      user_id: user.userId, 
      solana_address: address
    });
    if (existingWallet) {
      return { success: false, error: "This address is already linked to your account" };
    }

    // Check if this will be the first wallet (set as primary)
    const isFirstWallet = walletCount === 0;

    // Create external wallet (no private key)
    const walletId = `wallet_${user.userId}_${Date.now()}`;
    await (Wallet as any).create({
      id: walletId,
      user_id: user.userId,
      solana_address: address,
      encrypted_private_key: '', // No private key for external wallets
      key_exported: true, // External wallets are always considered "exported"
      key_management_mode: 'self-managed',
      wallet_source: 'external',
      is_primary: isFirstWallet, // Set as primary if first wallet
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { 
      success: true,
      message: "External wallet added successfully"
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add external wallet' };
  }
}

/**
 * Set wallet as primary (only one primary wallet at a time)
 * Uses HttpOnly cookie for authentication
 */
export async function setPrimaryWallet(walletId: string) {
  try {
    const user = await requireAuth();
    
    // Get wallet
    const wallet = await findFirstByFilter<any>(Wallet, { id: walletId, user_id: user.userId });
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    // Get all wallets
    const allWallets = await findAllByFilter<any>(Wallet, { user_id: user.userId });
    
    // Unset primary for all wallets
    for (const w of allWallets) {
      if (w.is_primary) {
        await (Wallet as any).update({
          id: w.id,
          is_primary: false,
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Set selected wallet as primary
    await (Wallet as any).update({
      id: wallet.id,
      is_primary: true,
      updated_at: new Date().toISOString(),
    });

    return { 
      success: true,
      message: "Primary wallet updated successfully"
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to set primary wallet' };
  }
}

/**
 * Delete wallet (only allowed for self-managed wallets, and must have at least 1 wallet remaining)
 * If deleting primary wallet, automatically sets remaining wallet as primary
 * Uses HttpOnly cookie for authentication
 */
export async function deleteWallet(walletId: string) {
  try {
    const user = await requireAuth();
    
    // Get wallet
    const wallet = await findFirstByFilter<any>(Wallet, { id: walletId, user_id: user.userId });
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    // Check if wallet is self-managed (required for deletion)
    if (wallet.key_management_mode !== 'self-managed') {
      return { success: false, error: "Only self-managed wallets can be deleted" };
    }

    // Check wallet count (must have at least 1 wallet)
    const walletCount = await getWalletCountByUserId(user.userId);
    if (walletCount <= 1) {
      return { success: false, error: "Cannot delete wallet. You must have at least 1 wallet." };
    }

    const wasPrimary = wallet.is_primary === true;

    // Hard delete (permanently remove from database)
    await (Wallet as any).delete(wallet.id);

    // If deleted wallet was primary, set remaining wallet as primary
    if (wasPrimary) {
      const remainingWallets = await findAllByFilter<any>(Wallet, { user_id: user.userId });
      if (remainingWallets.length > 0) {
        await (Wallet as any).update({
          id: remainingWallets[0].id,
          is_primary: true,
          updated_at: new Date().toISOString(),
        });
      }
    }

    return { 
      success: true,
      message: wasPrimary 
        ? "Primary wallet deleted. Remaining wallet set as primary."
        : "Wallet deleted successfully"
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete wallet' };
  }
}
