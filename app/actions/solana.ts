'use server';

/**
 * Solana Server Actions
 * Replaces SolanaResource from resources.js
 */

import { Connection, PublicKey } from '@solana/web3.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const SCHEMA = "pylomarket";

// Declare global harperdb type
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
    const wallets = await harperdb.searchByValue(
      SCHEMA,
      "wallets",
      "user_id",
      userId
    );

    if (!wallets || wallets.length === 0) {
      return { success: false, error: "Wallet not found" };
    }

    return await pollDeposits(wallets[0].solana_address);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
