"use client";

import { useEffect, useState } from "react";

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

export default function WalletPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    fetchWallet();
    fetchBalance();
  }, []);

  async function fetchWallet() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/wallet/solana/address", {
        headers: {
          "x-user-id": "user_123", // TODO: Get from token
        },
      });

      const data = await response.json();
      if (data.success) {
        setWallet(data.wallet);
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBalance() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      const response = await fetch("/api/wallet/balance", {
        headers: {
          "x-user-id": "user_123", // TODO: Get from token
        },
      });

      const data = await response.json();
      if (data.success) {
        setBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }

  async function handlePollDeposits() {
    if (!wallet) {
      alert("Wallet not found");
      return;
    }

    setPolling(true);
    try {
      const response = await fetch("/api/wallet/solana/poll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: wallet.solana_address,
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (data.count > 0) {
          alert(`Found ${data.count} new deposit(s)!`);
          fetchBalance();
        } else {
          alert("No new deposits found");
        }
      } else {
        alert(data.error || "Failed to poll deposits");
      }
    } catch (error) {
      console.error("Error polling deposits:", error);
      alert("Failed to poll deposits");
    } finally {
      setPolling(false);
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

        <div className="space-y-6">
          {/* Balance Card */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Balance</h2>
            <div className="text-4xl font-bold text-white mb-2">
              ${balance?.balance.toFixed(2) || "0.00"}
            </div>
            <p className="text-sm text-gray-400">{balance?.currency || "USD"}</p>
          </div>

          {/* Solana Address */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Deposit Address</h2>
            {wallet ? (
              <div className="space-y-4">
                <div className="bg-[#2a2a2a] p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Solana Address (Devnet)</p>
                  <p className="text-white font-mono text-sm break-all">
                    {wallet.solana_address}
                  </p>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                  <p className="text-sm text-yellow-400">
                    ⚠️ Send SOL to this address on Solana Devnet. Deposits will be
                    automatically credited to your balance.
                  </p>
                </div>
                <button
                  onClick={handlePollDeposits}
                  disabled={polling}
                  className="w-full px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {polling ? "Polling..." : "Check for Deposits"}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No wallet found</p>
                <button
                  onClick={fetchWallet}
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Generate Wallet
                </button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">How to Deposit</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400">
              <li>Copy your Solana deposit address above</li>
              <li>Send SOL from your Solana wallet to this address (Devnet only)</li>
              <li>Click "Check for Deposits" to verify your deposit</li>
              <li>Your balance will be updated automatically</li>
            </ol>
            <p className="text-xs text-gray-500 mt-4">
              Note: This is a devnet address. Do not send mainnet SOL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
