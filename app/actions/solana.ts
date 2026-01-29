'use server';

/**
 * Solana Server Actions
 * Replaces SolanaResource from resources.js
 */

import { Connection, PublicKey, Keypair, Transaction as SolanaTransaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { databases } from "harperdb";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const SCHEMA = "pylomarket";

// Extract tables from databases
const { Wallet, Transaction } = databases.pylomarket;

// Declare global harperdb type (for backward compatibility)
declare global {
  var harperdb: any;
}

// Lazy load Solana connection to avoid WebSocket conflicts
let solanaConnection: Connection | null = null;
function getSolanaConnection() {
  if (!solanaConnection) {
    solanaConnection = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return solanaConnection;
}

/**
 * Generate a new Solana wallet (Keypair)
 * Returns the public key (address) and private key (base64 encoded)
 */
export async function generateSolanaWallet(): Promise<{ 
  address: string; 
  publicKey: PublicKey;
  privateKey: string; // Base64 encoded secret key (64 bytes)
}> {
  try {
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    // Convert secret key (Uint8Array) to base64 for storage
    const privateKey = Buffer.from(keypair.secretKey).toString('base64');
    
    return {
      address,
      publicKey: keypair.publicKey,
      privateKey,
    };
  } catch (error: any) {
    throw new Error(`Failed to generate Solana wallet: ${error.message}`);
  }
}

export async function pollDeposits(address: string) {
  try {
    const connection = getSolanaConnection();
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    const balanceSOL = balance / 1e9;

    // Check for new transactions
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
    
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
  } catch (error: any) {
    return { success: false, error: `Solana polling error: ${error.message}` };
  }
}

export async function pollUserDeposits(userId: string) {
  try {
    // Find wallet using Resource API
    const query = {
      conditions: [{ attribute: 'user_id', value: userId }],
      limit: 1,
    };

    let wallet = null;
    for await (const record of (Wallet as any).search(query)) {
      wallet = record;
      break;
    }

    if (!wallet || !wallet.solana_address) {
      return { success: false, error: "Wallet not found" };
    }

    return await pollDeposits(wallet.solana_address);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check for new deposits to a Solana address
 * Compares current balance and transaction signatures with stored state
 * Returns new deposits that haven't been processed yet
 */
export async function checkNewDeposits(
  address: string,
  lastProcessedSignature?: string
): Promise<{
  success: boolean;
  newDeposits?: Array<{
    signature: string;
    amount: number;
    blockTime: number | null;
  }>;
  error?: string;
}> {
  try {
    const connection = getSolanaConnection();
    const publicKey = new PublicKey(address);

    // Get recent signatures
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit: 20,
      before: lastProcessedSignature,
    });

    if (signatures.length === 0) {
      return { success: true, newDeposits: [] };
    }

    // Get transaction details for each signature
    const newDeposits: Array<{
      signature: string;
      amount: number;
      blockTime: number | null;
    }> = [];

    for (const sigInfo of signatures) {
      // Skip if we've already processed this signature
      if (lastProcessedSignature && sigInfo.signature === lastProcessedSignature) {
        break;
      }

      try {
        const tx = await connection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx || !tx.meta) continue;

        // Check if this is an incoming transfer (balance increased)
        const preBalances = tx.meta.preBalances || [];
        const postBalances = tx.meta.postBalances || [];
        
        // Get account keys - handle both legacy and versioned transactions
        const accountKeys = tx.transaction.message.getAccountKeys
          ? tx.transaction.message.getAccountKeys().staticAccountKeys
          : (tx.transaction.message as any).accountKeys || [];

        // Find the account index for our address
        const accountIndex = accountKeys.findIndex(
          (key: PublicKey) => key.toBase58() === address
        );

        if (accountIndex >= 0) {
          const preBalance = preBalances[accountIndex] || 0;
          const postBalance = postBalances[accountIndex] || 0;
          const amount = (postBalance - preBalance) / 1e9; // Convert lamports to SOL

          // Only include if balance increased (deposit)
          if (amount > 0) {
            newDeposits.push({
              signature: sigInfo.signature,
              amount,
              blockTime: sigInfo.blockTime ?? null,
            });
          }
        }
      } catch (txError) {
        // Skip transactions we can't parse
        console.warn(`Failed to parse transaction ${sigInfo.signature}:`, txError);
        continue;
      }
    }

    return { success: true, newDeposits };
  } catch (error: any) {
    return { success: false, error: `Failed to check deposits: ${error.message}` };
  }
}

/**
 * Record a deposit transaction in the database
 */
export async function recordDepositTransaction(
  userId: string,
  signature: string,
  amount: number,
  address: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transactionId = `deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await (Transaction as any).create({
      id: transactionId,
      user_id: userId,
      type: 'deposit',
      amount,
      currency: 'SOL',
      status: 'completed',
      solana_signature: signature,
      metadata: JSON.stringify({ address }),
      created_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send SOL from hot wallet to user address
 * Requires HOT_WALLET_PRIVATE_KEY environment variable (base58 encoded)
 */
export async function sendSOL(
  toAddress: string,
  amountSOL: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const hotWalletPrivateKey = process.env.HOT_WALLET_PRIVATE_KEY;
    
    if (!hotWalletPrivateKey) {
      return { success: false, error: "Hot wallet not configured. Set HOT_WALLET_PRIVATE_KEY environment variable." };
    }

    // Parse private key (can be base58 string or array)
    let keypair: Keypair;
    try {
      // Try parsing as base58 string first
      const privateKeyBytes = Uint8Array.from(
        hotWalletPrivateKey.split(',').map(Number)
      );
      keypair = Keypair.fromSecretKey(privateKeyBytes);
    } catch {
      // If that fails, try as base58 string
      try {
        const decoded = Buffer.from(hotWalletPrivateKey, 'base64');
        keypair = Keypair.fromSecretKey(decoded);
      } catch {
        return { success: false, error: "Invalid hot wallet private key format" };
      }
    }

    const connection = getSolanaConnection();
    const toPublicKey = new PublicKey(toAddress);

    // Check hot wallet balance
    const hotWalletBalance = await connection.getBalance(keypair.publicKey);
    const requiredLamports = amountSOL * LAMPORTS_PER_SOL;
    const transactionFee = 5000; // Base fee

    if (hotWalletBalance < requiredLamports + transactionFee) {
      return {
        success: false,
        error: `Insufficient hot wallet balance. Required: ${(requiredLamports + transactionFee) / LAMPORTS_PER_SOL} SOL, Available: ${hotWalletBalance / LAMPORTS_PER_SOL} SOL`,
      };
    }

    // Create and send transaction
    const transaction = new SolanaTransaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: toPublicKey,
        lamports: requiredLamports,
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keypair],
      {
        commitment: 'confirmed',
      }
    );

    return { success: true, signature };
  } catch (error: any) {
    return { success: false, error: `Failed to send SOL: ${error.message}` };
  }
}
