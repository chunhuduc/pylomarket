/**
 * HarperDB Custom Function: Wallet Management
 * Handles wallet creation, balance queries, and deposit tracking
 */

module.exports = async (req, res) => {
  const { operation, data } = req.body;

  try {
    switch (operation) {
      case "create_wallet":
        return await createWallet(data);
      case "get_wallet":
        return await getWallet(data.userId);
      case "get_balance":
        return await getBalance(data.userId);
      case "update_balance":
        return await updateBalance(data);
      case "get_transactions":
        return await getTransactions(data.userId, data.limit);
      default:
        return res.status(400).json({ error: "Invalid operation" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

async function createWallet(data) {
  const { userId, solanaAddress } = data;

  if (!userId || !solanaAddress) {
    throw new Error("Missing required fields");
  }

  // Check if wallet exists
  const existingWallets = await harperdb.searchByValue(
    "wallets",
    "user_id",
    userId,
    ["id"]
  );

  if (existingWallets.length > 0) {
    return {
      success: true,
      wallet: existingWallets[0],
    };
  }

  // Create wallet
  const walletId = `wallet_${userId}`;
  const wallet = {
    id: walletId,
    user_id: userId,
    solana_address: solanaAddress,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await harperdb.insert("wallets", [wallet]);

  return {
    success: true,
    wallet,
  };
}

async function getWallet(userId) {
  const wallets = await harperdb.searchByValue(
    "wallets",
    "user_id",
    userId,
    ["id", "user_id", "solana_address", "created_at"]
  );

  if (wallets.length === 0) {
    return { success: false, error: "Wallet not found" };
  }

  return {
    success: true,
    wallet: wallets[0],
  };
}

async function getBalance(userId) {
  const balances = await harperdb.searchByValue(
    "balances",
    "user_id",
    userId,
    ["id", "user_id", "balance", "currency", "updated_at"]
  );

  if (balances.length === 0) {
    // Create default balance
    const balanceId = `balance_${userId}`;
    const balance = {
      id: balanceId,
      user_id: userId,
      balance: 0,
      currency: "USD",
      updated_at: new Date().toISOString(),
    };
    await harperdb.insert("balances", [balance]);
    return {
      success: true,
      balance,
    };
  }

  return {
    success: true,
    balance: balances[0],
  };
}

async function updateBalance(data) {
  const { userId, amount, type } = data; // type: 'deposit' or 'withdraw'

  const balances = await harperdb.searchByValue(
    "balances",
    "user_id",
    userId,
    ["id", "balance"]
  );

  let balance;
  if (balances.length === 0) {
    const balanceId = `balance_${userId}`;
    balance = {
      id: balanceId,
      user_id: userId,
      balance: 0,
      currency: "USD",
      updated_at: new Date().toISOString(),
    };
    await harperdb.insert("balances", [balance]);
  } else {
    balance = balances[0];
  }

  // Update balance
  if (type === "deposit") {
    balance.balance += amount;
  } else if (type === "withdraw") {
    if (balance.balance < amount) {
      throw new Error("Insufficient balance");
    }
    balance.balance -= amount;
  }

  balance.updated_at = new Date().toISOString();
  await harperdb.update("balances", [balance]);

  return {
    success: true,
    balance,
  };
}

async function getTransactions(userId, limit = 50) {
  const transactions = await harperdb.sql(
    `SELECT * FROM pylomarket.transactions WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT ${limit}`
  );

  return {
    success: true,
    transactions: transactions || [],
  };
}
