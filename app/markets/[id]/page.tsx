"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getCurrentUserInfo } from "@/actions";

interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  end_date: string;
  resolved: boolean;
  resolution: string | null;
}

interface Orderbook {
  yes: {
    bestPrice: number | null;
    orderCount: number;
  };
  no: {
    bestPrice: number | null;
    orderCount: number;
  };
}

export default function MarketPage() {
  const params = useParams();
  const marketId = params.id as string;
  const [market, setMarket] = useState<Market | null>(null);
  const [orderbook, setOrderbook] = useState<Orderbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [price, setPrice] = useState("0.50");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (marketId) {
      fetchMarket();
    }
  }, [marketId]);

  async function fetchMarket() {
    try {
      const response = await fetch(`/api/markets/${marketId}`);
      const data = await response.json();
      if (data.success) {
        setMarket(data.market);
        setOrderbook(data.orderbook);
      }
    } catch (error) {
      console.error("Error fetching market:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlaceOrder() {
    if (!quantity || !price) {
      alert("Please enter price and quantity");
      return;
    }

    // Check auth using Server Action (reads from HttpOnly cookie)
    const userResult = await getCurrentUserInfo();
    if (!userResult.success || !userResult.user) {
      alert("Please login first");
      return;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marketId,
          side,
          outcome,
          price: parseFloat(price),
          quantity: parseFloat(quantity),
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert("Order placed successfully!");
        fetchMarket();
        setQuantity("");
      } else {
        alert(data.error || "Failed to place order");
      }
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-400">Loading market...</p>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-400">Market not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{market.title}</h1>
          <p className="text-gray-400 mb-4">{market.description}</p>
          <div className="flex items-center space-x-4 text-sm">
            <span className="px-2 py-1 bg-[#2a2a2a] text-gray-300 rounded">
              {market.category}
            </span>
            <span className="text-gray-500">
              Ends: {new Date(market.end_date).toLocaleDateString()}
            </span>
            {market.resolved && (
              <span className="px-2 py-1 bg-green text-white rounded">
                Resolved: {market.resolution}
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Book */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Order Book</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-green mb-2">YES</h3>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">
                      Best Price:{" "}
                      <span className="text-white font-semibold">
                        {orderbook?.yes.bestPrice
                          ? (orderbook.yes.bestPrice * 100).toFixed(2)
                          : "N/A"}
                        %
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Orders: {orderbook?.yes.orderCount || 0}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-red mb-2">NO</h3>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">
                      Best Price:{" "}
                      <span className="text-white font-semibold">
                        {orderbook?.no.bestPrice
                          ? (orderbook.no.bestPrice * 100).toFixed(2)
                          : "N/A"}
                        %
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Orders: {orderbook?.no.orderCount || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Place Order */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Place Order</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Side
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSide("buy")}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      side === "buy"
                        ? "bg-green text-white"
                        : "bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]"
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setSide("sell")}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      side === "sell"
                        ? "bg-red text-white"
                        : "bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]"
                    }`}
                  >
                    Sell
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Outcome
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setOutcome("YES")}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      outcome === "YES"
                        ? "bg-green text-white"
                        : "bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]"
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setOutcome("NO")}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      outcome === "NO"
                        ? "bg-red text-white"
                        : "bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]"
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price (0-1)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white focus:outline-none focus:border-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white focus:outline-none focus:border-green"
                  placeholder="0.00"
                />
              </div>

              <button
                onClick={handlePlaceOrder}
                className="w-full px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
