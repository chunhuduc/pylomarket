"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  getBalance, 
  getWallet, 
  createWallet, 
  getTransactions,
  checkDeposits,
  withdraw,
  getCurrentUserInfo,
  exportPrivateKey,
  markKeyAsExported,
  getAllWallets,
  addExternalWallet,
  deleteWallet,
  setPrimaryWallet
} from "@/actions";

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
  key_exported?: boolean;
  key_management_mode?: 'app-managed' | 'self-managed';
  wallet_source?: 'system-generated' | 'external' | 'external-like';
  is_primary?: boolean;
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
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [addingExternal, setAddingExternal] = useState(false);
  const [externalAddress, setExternalAddress] = useState("");
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [exportingKey, setExportingKey] = useState(false);
  const [exportingWalletId, setExportingWalletId] = useState<string | null>(null);
  const [exportedPrivateKey, setExportedPrivateKey] = useState<string | null>(null);
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, [router]);

  async function checkAuthAndFetch() {
    try {
      const userResult = await getCurrentUserInfo();
      if (!userResult.success || !userResult.user) {
        router.push("/auth/login");
        return;
      }
      await fetchData();
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/auth/login");
    }
  }

  async function fetchWallets() {
    try {
      // Use Server Action to get all wallets
      const result = await getAllWallets();
      
      if (result.success && result.wallets) {
        setWallets(result.wallets);
      } else {
        setWallets([]);
      }
    } catch (error) {
      console.error("Error fetching wallets:", error);
      setWallets([]);
    }
  }

  async function fetchData() {
    await Promise.all([fetchWallets(), fetchBalance(), fetchTransactions()]);
    setLoading(false);
  }

  async function handleCreateWallet() {
    setCreatingWallet(true);
    setError("");
    setSuccess("");

    try {
      // Use Server Action (reads from HttpOnly cookie)
      const result = await createWallet();
      
      if (result.success) {
        setSuccess("Wallet created successfully!");
        await fetchWallets();
        await fetchBalance();
      } else {
        setError(result.error || "Failed to create wallet");
      }
    } catch (error) {
      console.error("Error creating wallet:", error);
      setError("Failed to create wallet");
    } finally {
      setCreatingWallet(false);
    }
  }

  async function handleAddExternalWallet() {
    if (!externalAddress.trim()) {
      setError("Please enter a valid Solana address");
      return;
    }

    setAddingExternal(true);
    setError("");
    setSuccess("");

    try {
      const result = await addExternalWallet(externalAddress.trim());
      
      if (result.success) {
        setSuccess("External wallet added successfully!");
        setExternalAddress("");
        setShowAddExternal(false);
        await fetchWallets();
      } else {
        setError(result.error || "Failed to add external wallet");
      }
    } catch (error) {
      console.error("Error adding external wallet:", error);
      setError("Failed to add external wallet");
    } finally {
      setAddingExternal(false);
    }
  }

  async function handleSetPrimary(walletId: string) {
    setSettingPrimary(walletId);
    setError("");
    setSuccess("");

    try {
      const result = await setPrimaryWallet(walletId);
      
      if (result.success) {
        setSuccess(result.message || "Primary wallet updated successfully!");
        await fetchWallets();
      } else {
        setError(result.error || "Failed to set primary wallet");
      }
    } catch (error) {
      console.error("Error setting primary wallet:", error);
      setError("Failed to set primary wallet");
    } finally {
      setSettingPrimary(null);
    }
  }

  async function handleDeleteWallet(walletId: string) {
    if (!confirm("Are you sure you want to delete this wallet? This action cannot be undone.")) {
      return;
    }

    setDeletingWalletId(walletId);
    setError("");
    setSuccess("");

    try {
      const result = await deleteWallet(walletId);
      
      if (result.success) {
        setSuccess(result.message || "Wallet deleted successfully!");
        await fetchWallets();
      } else {
        setError(result.error || "Failed to delete wallet");
      }
    } catch (error) {
      console.error("Error deleting wallet:", error);
      setError("Failed to delete wallet");
    } finally {
      setDeletingWalletId(null);
    }
  }

  async function fetchBalance() {
    try {
      // Use Server Action (reads from HttpOnly cookie)
      const result = await getBalance();
      
      if (result.success && result.balance) {
        setBalance(result.balance);
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
      // Use Server Action (reads from HttpOnly cookie)
      const result = await getTransactions(20);
      
      if (result.success) {
        setTransactions(result.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }

  async function handleCheckDeposits() {
    if (!primaryWallet) {
      setError("No primary wallet found. Please set a primary wallet first.");
      return;
    }

    setChecking(true);
    setError("");
    setSuccess("");

    try {
      // Use Server Action (reads from HttpOnly cookie)
      const result = await checkDeposits();
      
      if (result.success) {
        if (result.creditedCount && result.creditedCount > 0) {
          setSuccess(`Successfully credited ${result.creditedCount} deposit(s)!`);
          await fetchBalance();
          await fetchTransactions();
        } else {
          setSuccess("No new deposits found");
        }
      } else {
        setError(result.error || "Failed to check deposits");
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

    if (!primaryWallet) {
      setError("No primary wallet found. Please set a primary wallet first.");
      return;
    }

    setWithdrawing(true);

    try {
      // Use Server Action (reads from HttpOnly cookie)
      const result = await withdraw(withdrawAddress, amount);
      
      if (result.success) {
        setSuccess(`Withdrawal successful! Signature: ${result.signature}`);
        setWithdrawAddress("");
        setWithdrawAmount("");
        await fetchBalance();
        await fetchTransactions();
      } else {
        setError(result.error || "Withdrawal failed");
      }
    } catch (error) {
      console.error("Error withdrawing:", error);
      setError("Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  }

  function copyAddress(address: string) {
    if (address) {
      navigator.clipboard.writeText(address);
      setSuccess("Address copied to clipboard!");
      setTimeout(() => setSuccess(""), 2000);
    }
  }

  async function handleExportPrivateKey(walletId: string) {
    setExportingWalletId(walletId);
    setShowKeyWarning(true);
  }

  async function confirmExportKey() {
    if (!exportingWalletId) return;

    // Check if wallet is already self-managed
    const wallet = wallets.find(w => w.id === exportingWalletId);
    if (wallet && wallet.key_management_mode === 'self-managed') {
      setError("This wallet is already self-managed. Private key has been exported.");
      setShowKeyWarning(false);
      setExportingWalletId(null);
      return;
    }

    setExportingKey(true);
    setError("");
    setSuccess("");

    try {
      // Export private key
      const exportResult = await exportPrivateKey(exportingWalletId);
      
      if (exportResult.success && exportResult.privateKey) {
        setExportedPrivateKey(exportResult.privateKey);
        
        // Mark as exported (always self-managed when exported)
        const markResult = await markKeyAsExported(exportingWalletId);
        
        if (!markResult.success) {
          console.error("Failed to mark key as exported:", markResult.error);
          setError("Key exported but failed to update wallet status. Please refresh the page.");
        }
        
        // Refresh wallet data to reflect the change
        await fetchWallets();
        
        setShowKeyWarning(false);
      } else {
        setError(exportResult.error || "Failed to export private key");
        setShowKeyWarning(false);
      }
    } catch (error) {
      console.error("Error exporting key:", error);
      setError("Failed to export private key");
      setShowKeyWarning(false);
    } finally {
      setExportingKey(false);
      setExportingWalletId(null);
    }
  }

  function downloadPrivateKey() {
    if (!exportedPrivateKey || !exportingWalletId) return;
    const wallet = wallets.find(w => w.id === exportingWalletId);
    if (!wallet) return;

    const blob = new Blob([exportedPrivateKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solana-private-key-${wallet.solana_address.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess("Private key downloaded!");
    setTimeout(() => {
      setExportedPrivateKey(null);
      setSuccess("");
    }, 2000);
  }

  function copyPrivateKey() {
    if (exportedPrivateKey) {
      navigator.clipboard.writeText(exportedPrivateKey);
      setSuccess("Private key copied to clipboard!");
      setTimeout(() => setSuccess(""), 2000);
    }
  }


  const primaryWallet = wallets.find(w => w.is_primary === true) || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-400">Loading wallets...</p>
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
          {/* Wallet List & Management */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">My Wallets ({wallets.length}/2)</h2>
              <div className="flex gap-2">
                {wallets.length < 2 && (
                  <>
                    <button
                      onClick={handleCreateWallet}
                      disabled={creatingWallet}
                      className="px-4 py-2 bg-white text-black text-sm rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {creatingWallet ? "Creating..." : "Create Wallet"}
                    </button>
                    <button
                      onClick={() => setShowAddExternal(true)}
                      disabled={addingExternal}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Add External
                    </button>
                  </>
                )}
              </div>
            </div>

            {wallets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No wallets yet. Create your first wallet to get started.</p>
                <button
                  onClick={handleCreateWallet}
                  disabled={creatingWallet}
                  className="px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {creatingWallet ? "Creating Wallet..." : "Create New Wallet"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      wallet.is_primary
                        ? 'bg-[#2a2a2a] border-green-500'
                        : 'bg-[#2a2a2a] border-[#3a3a3a]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-white font-medium">
                            {wallet.wallet_source === 'external' ? 'External Wallet' : 
                             wallet.wallet_source === 'external-like' ? 'Self-Managed Wallet' : 
                             'App-Managed Wallet'}
                          </p>
                          {wallet.is_primary && (
                            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded font-medium">Primary</span>
                          )}
                        </div>
                        <p className="text-gray-400 font-mono text-sm break-all mb-2">
                          {wallet.solana_address}
                        </p>
                        <div className="flex items-center gap-4 text-xs">
                          <span className={`px-2 py-1 rounded ${
                            wallet.key_management_mode === 'self-managed' 
                              ? 'bg-yellow-900/30 text-yellow-400' 
                              : 'bg-blue-900/30 text-blue-400'
                          }`}>
                            {wallet.key_management_mode === 'self-managed' ? 'Self-Managed' : 'App-Managed'}
                          </span>
                          {wallet.wallet_source === 'external' && (
                            <span className="text-gray-500">External</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {!wallet.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(wallet.id)}
                            disabled={settingPrimary === wallet.id}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                          >
                            {settingPrimary === wallet.id ? "Setting..." : "Set as Primary"}
                          </button>
                        )}
                        {wallet.key_management_mode === 'app-managed' && (
                          <button
                            onClick={() => handleExportPrivateKey(wallet.id)}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                          >
                            Export Key
                          </button>
                        )}
                        {wallet.key_management_mode === 'self-managed' && wallets.length > 1 && (
                          <button
                            onClick={() => handleDeleteWallet(wallet.id)}
                            disabled={deletingWalletId === wallet.id}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {deletingWalletId === wallet.id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add External Wallet Modal */}
          {showAddExternal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold text-white mb-4">Add External Wallet</h3>
                <div className="space-y-4 mb-6">
                  <p className="text-sm text-gray-400">
                    Enter a Solana wallet address to link it to your account. You will manage this wallet externally.
                  </p>
                  <input
                    type="text"
                    value={externalAddress}
                    onChange={(e) => setExternalAddress(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddExternal(false);
                      setExternalAddress("");
                    }}
                    className="flex-1 px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddExternalWallet}
                    disabled={addingExternal || !externalAddress.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {addingExternal ? "Adding..." : "Add Wallet"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wallet Setup Section - Show if no wallet */}
          {wallets.length === 0 && (
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
            </div>
          )}

          {/* Balance Card */}
          {primaryWallet && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Balance</h2>
              <div className="text-4xl font-bold text-white mb-2">
                {balance?.balance.toFixed(4) || "0.0000"} {balance?.currency || "SOL"}
              </div>
              <p className="text-sm text-gray-400">Available for trading</p>
            </div>
          )}

          {/* Deposit Section */}
          {primaryWallet && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Deposit SOL</h2>
              {primaryWallet.solana_address ? (
                <div className="space-y-4">
                  <div className="bg-[#2a2a2a] p-4 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Your Deposit Address (Primary Wallet)</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono text-sm break-all flex-1">
                        {primaryWallet.solana_address}
                      </p>
                      <button
                        onClick={() => copyAddress(primaryWallet!.solana_address)}
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
          {primaryWallet && (
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
          {primaryWallet && (
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

        {/* Export Key Warning Modal */}
        {showKeyWarning && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">⚠️ Export Private Key</h3>
              <div className="space-y-4 mb-6">
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                  <p className="text-sm text-red-400 font-medium mb-2">Security Warning</p>
                  <ul className="text-xs text-red-300 space-y-1 list-disc list-inside">
                    <li>Anyone with your private key can control your wallet</li>
                    <li>Never share your private key with anyone</li>
                    <li>Store it securely offline (hardware wallet, paper wallet, etc.)</li>
                    <li>If you lose it, you lose access to your funds</li>
                  </ul>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                  <p className="text-sm text-yellow-400 font-medium mb-2">⚠️ Important</p>
                  <p className="text-xs text-yellow-300">
                    After exporting, the app will stop managing your private key. You will have full control but also full responsibility for keeping it secure. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowKeyWarning(false)}
                  className="flex-1 px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmExportKey()}
                  disabled={exportingKey}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {exportingKey ? "Exporting..." : "Export & Switch to Self-Managed"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Exported Key Display Modal */}
        {exportedPrivateKey && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 max-w-lg w-full">
              <h3 className="text-xl font-bold text-white mb-4">✅ Private Key Exported</h3>
              <div className="space-y-4 mb-6">
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                  <p className="text-sm text-yellow-400 font-medium mb-2">⚠️ Keep This Secure!</p>
                  <p className="text-xs text-yellow-300">
                    Save this private key immediately. It will not be shown again. Store it in a secure location.
                  </p>
                </div>
                <div className="bg-[#2a2a2a] p-4 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">Your Private Key:</p>
                  <p className="text-white font-mono text-sm break-all select-all">
                    {exportedPrivateKey}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={copyPrivateKey}
                  className="flex-1 px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-colors"
                >
                  Copy
                </button>
                <button
                  onClick={downloadPrivateKey}
                  className="flex-1 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Download as File
                </button>
                <button
                  onClick={() => {
                    setExportedPrivateKey(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
