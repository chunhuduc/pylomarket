"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  end_date: string;
  resolved: boolean;
  resolution: string | null;
}

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();
  }, []);

  async function fetchMarkets() {
    try {
      const response = await fetch("/api/markets?resolved=false&limit=20");
      const data = await response.json();
      if (data.success) {
        setMarkets(data.markets);
      }
    } catch (error) {
      console.error("Error fetching markets:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Active Markets</h1>
          <p className="text-gray-400">Place bets on future events</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading markets...</p>
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No markets available</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {markets.map((market) => (
              <Link
                key={market.id}
                href={`/markets/${market.id}`}
                className="block p-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors"
              >
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                  {market.title}
                </h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {market.description}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-1 bg-[#2a2a2a] text-gray-300 rounded">
                    {market.category}
                  </span>
                  <span className="text-gray-500">
                    Ends: {new Date(market.end_date).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
