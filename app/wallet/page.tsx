"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Balance {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

interface Wallet {
  id: string;
  user_id: string;
  solana_address: string;
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  solana_signature: string | null;
  metadata: string | null;
  created_at: string;
}

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creatingWallet, setCreatingWallet] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchData();
  }, [router]);

  function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async function fetchData() {
    await Promise.all([fetchWallet(), fetchBalance(), fetchTransactions()]);
    setLoading(false);
  }

  async function fetchWallet() {
    try {
      const response = await fetch("/api/wallet/solana/address", {
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.success && data.wallet) {
        setWallet(data.wallet);
      } else {
        // Wallet not found - user needs to create one
        setWallet(null);
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
      setWallet(null);
    }
  }

  async function handleCreateWallet() {
    setCreatingWallet(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/wallet/create", {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("Wallet created successfully!");
        await fetchWallet();
        await fetchBalance();
      } else {
        setError(data.error || "Failed to create wallet");
      }
    } catch (error) {
      console.error("Error creating wallet:", error);
      setError("Failed to create wallet");
    } finally {
      setCreatingWallet(false);
    }
  }

  async function fetchBalance() {
    try {
      const response = await fetch("/api/wallet/balance", {
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.success && data.balance) {
        setBalance(data.balance);
      } else {
        // Balance not found - will be created when wallet is created
        setBalance(null);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(null);
    }
  }

  async function fetchTransactions() {
    try {
      const response = await fetch("/api/wallet/transactions?limit=20", {
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }

  async function handleCheckDeposits() {
    if (!wallet) {
      setError("Wallet not found");
      return;
    }

    setChecking(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/wallet/solana/check-deposits", {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.success) {
        if (data.creditedCount > 0) {
          setSuccess(`Successfully credited ${data.creditedCount} deposit(s)!`);
          await fetchBalance();
          await fetchTransactions();
        } else {
          setSuccess("No new deposits found");
        }
      } else {
        setError(data.error || "Failed to check deposits");
      }
    } catch (error) {
      console.error("Error checking deposits:", error);
      setError("Failed to check deposits");
    } finally {
      setChecking(false);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!withdrawAddress || !withdrawAmount) {
      setError("Please fill in all fields");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Invalid amount");
      return;
    }

    if (!balance || balance.balance < amount) {
      setError("Insufficient balance");
      return;
    }

    setWithdrawing(true);

    try {
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          toAddress: withdrawAddress,
          amount: amount,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Withdrawal successful! Signature: ${data.signature}`);
        setWithdrawAddress("");
        setWithdrawAmount("");
        await fetchBalance();
        await fetchTransactions();
      } else {
        setError(data.error || "Withdrawal failed");
      }
    } catch (error) {
      console.error("Error withdrawing:", error);
      setError("Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  }

  function copyAddress() {
    if (wallet?.solana_address) {
      navigator.clipboard.writeText(wallet.solana_address);
      setSuccess("Address copied to clipboard!");
      setTimeout(() => setSuccess(""), 2000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-400">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Wallet</h1>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-900/20 border border-green-700/50 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Wallet Setup Section - Show if no wallet */}
          {!wallet && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Setup Your Wallet</h2>
              <p className="text-gray-400 mb-6">
                You need to create a wallet to start managing your balance and making deposits.
              </p>
              <button
                onClick={handleCreateWallet}
                disabled={creatingWallet}
                className="w-full px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingWallet ? "Creating Wallet..." : "Create New Wallet"}
              </button>
              <p className="text-xs text-gray-500 mt-4 text-center">
                Note: Connect external wallet feature coming soon
              </p>
            </div>
          )}

          {/* Balance Card */}
          {wallet && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Balance</h2>
              <div className="text-4xl font-bold text-white mb-2">
                {balance?.balance.toFixed(4) || "0.0000"} {balance?.currency || "SOL"}
              </div>
              <p className="text-sm text-gray-400">Available for trading</p>
            </div>
          )}

          {/* Deposit Section */}
          {wallet && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Deposit SOL</h2>
              {wallet.solana_address ? (
                <div className="space-y-4">
                  <div className="bg-[#2a2a2a] p-4 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Your Deposit Address</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono text-sm break-all flex-1">
                        {wallet.solana_address}
                      </p>
                      <button
                        onClick={copyAddress}
                        className="px-3 py-1 bg-[#3a3a3a] text-white text-sm rounded hover:bg-[#4a4a4a] transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                    <p className="text-sm text-yellow-400">
                      ⚠️ Send SOL to this address on Solana Devnet. After sending, click "Check for Deposits" to credit your balance.
                    </p>
                  </div>
                  <button
                    onClick={handleCheckDeposits}
                    disabled={checking}
                    className="w-full px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checking ? "Checking..." : "Check for Deposits"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">Wallet address not found</p>
                </div>
              )}
            </div>
          )}

          {/* Withdrawal Section */}
          {wallet && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Withdraw SOL</h2>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Amount (SOL)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
                  />
                  {balance && (
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {balance.balance.toFixed(4)} SOL
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={withdrawing || !withdrawAddress || !withdrawAmount}
                  className="w-full px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawing ? "Processing..." : "Withdraw"}
                </button>
              </form>
            </div>
          )}

          {/* Transaction History */}
          {wallet && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Transaction History</h2>
              {transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              tx.type === "deposit"
                                ? "text-green-400"
                                : tx.type === "withdrawal"
                                ? "text-red-400"
                                : "text-gray-400"
                            }`}
                          >
                            {tx.type === "deposit" ? "Deposit" : tx.type === "withdrawal" ? "Withdrawal" : tx.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(tx.created_at).toLocaleString()}
                          </span>
                        </div>
                        {tx.solana_signature && (
                          <p className="text-xs text-gray-500 font-mono mt-1 truncate">
                            {tx.solana_signature}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-medium ${
                            tx.type === "deposit" ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {tx.type === "deposit" ? "+" : "-"}
                          {tx.amount.toFixed(4)} {tx.currency}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{tx.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">
                  No transactions yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
