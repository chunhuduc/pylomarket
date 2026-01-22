/**
 * HarperDB Custom Function: Wallet Management
 * Handles wallet creation, balance queries, and deposit tracking
 * 
 * Auto-deployed by HarperDB when in custom_functions folder
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
    "pylomarket",
    "wallets",
    "user_id",
    userId,
    ["id"]
  );

  if (existingWallets && existingWallets.length > 0) {
    return res.json({
      success: true,
      wallet: existingWallets[0],
    });
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

  await harperdb.insert("pylomarket", "wallets", [wallet]);

  return res.json({
    success: true,
    wallet,
  });
}

async function getWallet(userId) {
  const wallets = await harperdb.searchByValue(
    "pylomarket",
    "wallets",
    "user_id",
    userId,
    ["id", "user_id", "solana_address", "created_at"]
  );

  if (!wallets || wallets.length === 0) {
    return res.json({ success: false, error: "Wallet not found" });
  }

  return res.json({
    success: true,
    wallet: wallets[0],
  });
}

async function getBalance(userId) {
  const balances = await harperdb.searchByValue(
    "pylomarket",
    "balances",
    "user_id",
    userId,
    ["id", "user_id", "balance", "currency", "updated_at"]
  );

  if (!balances || balances.length === 0) {
    // Create default balance
    const balanceId = `balance_${userId}`;
    const balance = {
      id: balanceId,
      user_id: userId,
      balance: 0,
      currency: "USD",
      updated_at: new Date().toISOString(),
    };
    await harperdb.insert("pylomarket", "balances", [balance]);
    return res.json({
      success: true,
      balance,
    });
  }

  return res.json({
    success: true,
    balance: balances[0],
  });
}

async function updateBalance(data) {
  const { userId, amount, type } = data; // type: 'deposit' or 'withdraw'

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
  await harperdb.update("pylomarket", "balances", [balance]);

  return res.json({
    success: true,
    balance,
  });
}

async function getTransactions(userId, limit = 50) {
  const transactions = await harperdb.sql(
    `SELECT * FROM pylomarket.transactions WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT ${limit}`
  );

  return res.json({
    success: true,
    transactions: transactions || [],
  });
}
