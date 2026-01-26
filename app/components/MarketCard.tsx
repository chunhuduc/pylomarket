"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  end_date: string;
  resolved: boolean;
  resolution: string | null;
  created_at?: string;
}

interface Props {
  market: Market;
}

// Helper function to format volume
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}m`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}k`;
  }
  return `$${volume}`;
}

// Helper function to check if market is new (created within last 7 days)
function isNewMarket(createdAt?: string): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const now = new Date();
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7;
}

// Helper function to format timeframe
function formatTimeframe(endDate: string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Ended";
  if (diffDays === 0) {
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (diffHours <= 1) return "Ending soon";
    return `Today ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `${diffDays}d left`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)}w left`;
  return end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Circular Progress Component
function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="transform -rotate-90 w-16 h-16">
        <circle
          cx="32"
          cy="32"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-[#21262D]"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-[#3b82f6] transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{percentage}%</span>
      </div>
    </div>
  );
}

// Category Icon Helper
function getCategoryIcon(category: string) {
  // Simple emoji-based icons for now
  const icons: Record<string, string> = {
    Politics: "🏛️",
    Sports: "⚽",
    Crypto: "₿",
    Finance: "💹",
    Tech: "💻",
    Culture: "🎭",
    World: "🌍",
    Economy: "📈",
    "Climate & Science": "🌡️",
    Elections: "🗳️",
  };
  return icons[category] || "📊";
}

export default function MarketCard({ market }: Props) {
  // Fake probability data (50/50 default, will be calculated from orders later)
  const yesProbability = 50;
  const noProbability = 50;

  // Fake volume data (will be calculated from trades later)
  // Use useState + useEffect to generate on client only to avoid hydration mismatch
  const [volume, setVolume] = useState(0);
  const [timeframe, setTimeframe] = useState("");
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    // Generate random volume only on client
    setVolume(Math.floor(Math.random() * 5000000) + 10000); // $10k - $5m

    // Calculate timeframe only on client
    setTimeframe(formatTimeframe(market.end_date));

    // Check if new only on client
    setIsNew(isNewMarket(market.created_at));
  }, [market.end_date, market.created_at]);

  return (
    <Link
      href={`/markets/${market.id}`}
      className="block p-5 bg-[#161B22] border border-[#30363D] rounded-lg card-hover relative"
    >
      {/* NEW Badge - Top Right */}
      {isNew && (
        <span className="absolute top-3 right-3 px-2 py-0.5 bg-[#fbbf24] text-[#0D1117] text-xs font-bold rounded">
          NEW
        </span>
      )}

      {/* Category Icon and Title */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 bg-[#21262D] rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
          {getCategoryIcon(market.category)}
        </div>
        <div className="flex-1 min-w-0">
          <span className="inline-block px-2 py-1 bg-[#21262D] text-[#8B949E] text-xs font-medium rounded-md uppercase tracking-wide mb-2">
            {market.category}
          </span>
          <h3 className="text-base font-semibold text-white line-clamp-2 leading-snug">
            {market.title}
          </h3>
        </div>
      </div>

      {/* Circular Progress and Yes/No Buttons */}
      <div className="flex items-center justify-between mb-4">
        {/* Circular Progress */}
        <div className="flex items-center gap-2">
          <CircularProgress percentage={yesProbability} />
          <span className="text-xs text-[#8B949E]">chance</span>
        </div>

        {/* Yes/No Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              // Handle Yes click
            }}
            className="px-4 py-2 bg-[#10b981] text-white text-sm font-semibold rounded-lg hover:bg-[#059669] transition-colors"
          >
            Yes {yesProbability}%
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              // Handle No click
            }}
            className="px-4 py-2 bg-[#ef4444] text-white text-sm font-semibold rounded-lg hover:bg-[#dc2626] transition-colors"
          >
            No {noProbability}%
          </button>
        </div>
      </div>

      {/* Footer with Volume, Timeframe, and Action Icons */}
      <div className="flex items-center justify-between text-xs pt-3 border-t border-[#30363D]">
        <div className="flex items-center gap-4">
          <span className="text-[#3b82f6] font-semibold">
            {volume > 0 ? `${formatVolume(volume)} Vol.` : "Loading..."}
          </span>
          <span className="text-[#8B949E]">{timeframe || "Loading..."}</span>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              // Handle gift/share
            }}
            className="p-1.5 text-[#8B949E] hover:text-[#3b82f6] transition-colors"
            aria-label="Share"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              // Handle bookmark
            }}
            className="p-1.5 text-[#8B949E] hover:text-[#3b82f6] transition-colors"
            aria-label="Bookmark"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </button>
        </div>
      </div>
    </Link>
  );
}
