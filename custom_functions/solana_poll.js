/**
 * HarperDB Custom Function: Solana Deposit Polling
 * Scheduled job to poll Solana devnet for deposits and credit balances
 * 
 * This can be set up as a scheduled job in HarperDB
 * Auto-deployed by HarperDB when in custom_functions folder
 */

const { Connection, PublicKey } = require("@solana/web3.js");

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

module.exports = async (req, res) => {
  const { operation, data } = req.body;

  try {
    switch (operation) {
      case "poll_deposits":
        return await pollDeposits(data);
      case "poll_user_deposits":
        return await pollUserDeposits(data.userId);
      default:
        return res.status(400).json({ error: "Invalid operation" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

async function pollDeposits(data) {
  const { address } = data;

  if (!address) {
    throw new Error("Address required");
  }

  // Find wallet
  const wallets = await harperdb.searchByValue(
    "pylomarket",
    "wallets",
    "solana_address",
    address,
    ["id", "user_id"]
  );

  if (!wallets || wallets.length === 0) {
    return res.json({ success: false, error: "Wallet not found" });
  }

  const wallet = wallets[0];
  const userId = wallet.user_id;

  // Get last processed signature
  const lastTx = await harperdb.sql(
    `SELECT solana_signature FROM pylomarket.transactions WHERE user_id = '${userId}' AND type = 'deposit' AND solana_signature IS NOT NULL ORDER BY created_at DESC LIMIT 1`
  );

  const lastSignature =
    lastTx && lastTx.length > 0 ? lastTx[0].solana_signature : null;

  // Get recent signatures
  const publicKey = new PublicKey(address);
  const signatures = await connection.getSignaturesForAddress(publicKey, {
    limit: 20,
  });

  // Filter new signatures
  let newSignatures = signatures;
  if (lastSignature) {
    const lastIndex = signatures.findIndex((sig) => sig.signature === lastSignature);
    if (lastIndex >= 0) {
      newSignatures = signatures.slice(0, lastIndex);
    }
  }

  const deposits = [];

  // Process each new signature
  for (const sigInfo of newSignatures) {
    try {
      const tx = await connection.getTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) continue;

      const preBalances = tx.meta.preBalances;
      const postBalances = tx.meta.postBalances;
      const accountKeys = tx.transaction.message.accountKeys;

      const ourIndex = accountKeys.findIndex((key) => key.toBase58() === address);

      if (ourIndex < 0) continue;

      const preBalance = preBalances[ourIndex];
      const postBalance = postBalances[ourIndex];
      const amount = (postBalance - preBalance) / 1e9; // Convert lamports to SOL

      if (amount > 0) {
        // Check if already processed
        const existingTx = await harperdb.searchByValue(
          "pylomarket",
          "transactions",
          "solana_signature",
          sigInfo.signature,
          ["id"]
        );

        if (existingTx && existingTx.length > 0) {
          continue;
        }

        // Record deposit (1 SOL = 100 USD for MVP)
        const usdAmount = amount * 100;

        // Update balance
        const balances = await harperdb.searchByValue(
          "pylomarket",
          "balances",
          "user_id",
          userId,
          ["id", "balance"]
        );

        let balance;
        if (!balances || balances.length === 0) {
          const balanceId = `balance_${userId}`;
          balance = {
            id: balanceId,
            user_id: userId,
            balance: 0,
            currency: "USD",
            updated_at: new Date().toISOString(),
          };
          await harperdb.insert("pylomarket", "balances", [balance]);
        } else {
          balance = balances[0];
        }

        balance.balance += usdAmount;
        balance.updated_at = new Date().toISOString();
        await harperdb.update("pylomarket", "balances", [balance]);

        // Record transaction
        const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 11)}`;
        await harperdb.insert("pylomarket", "transactions", [
          {
            id: transactionId,
            user_id: userId,
            type: "deposit",
            amount: usdAmount,
            currency: "USD",
            status: "completed",
            solana_signature: sigInfo.signature,
            metadata: JSON.stringify({
              source: "solana",
              solAmount: amount,
              solPrice: 100,
            }),
            created_at: new Date().toISOString(),
          },
        ]);

        deposits.push({
          signature: sigInfo.signature,
          amount: usdAmount,
          solAmount: amount,
          timestamp: sigInfo.blockTime,
        });
      }
    } catch (error) {
      console.error(`Error processing signature ${sigInfo.signature}:`, error);
    }
  }

  return res.json({
    success: true,
    deposits,
    count: deposits.length,
  });
}

async function pollUserDeposits(userId) {
  // Get user's wallet
  const wallets = await harperdb.searchByValue(
    "pylomarket",
    "wallets",
    "user_id",
    userId,
    ["solana_address"]
  );

  if (!wallets || wallets.length === 0) {
    return res.json({ success: false, error: "Wallet not found" });
  }

  return await pollDeposits({ address: wallets[0].solana_address });
}
