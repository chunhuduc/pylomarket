"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { listMarkets } from "@/actions";
import MarketCard from "./MarketCard";
import MarketFilters from "./MarketFilters";

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
  initialMarkets: Market[];
}

type FilterType = "all" | "trending" | "popular" | "ending-soon";
type SortType = "newest" | "oldest" | "ending-soon";

export default function InfiniteMarketsList({ initialMarkets }: Props) {
  const [allMarkets, setAllMarkets] = useState<Market[]>(initialMarkets);
  const [offset, setOffset] = useState(20);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("newest");
  const observerTarget = useRef<HTMLDivElement>(null);

  // Filter and sort markets
  const filteredAndSortedMarkets = useMemo(() => {
    let filtered = [...allMarkets];

    // Apply filter
    if (activeFilter === "trending") {
      // Sort by created_at (newer = more trending for now)
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.created_at || a.end_date).getTime();
        const dateB = new Date(b.created_at || b.end_date).getTime();
        return dateB - dateA;
      });
    } else if (activeFilter === "popular") {
      // Sort by end_date (closer = more popular for now)
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.end_date).getTime();
        const dateB = new Date(b.end_date).getTime();
        return dateA - dateB;
      });
    } else if (activeFilter === "ending-soon") {
      // Filter markets ending within 7 days
      const now = new Date().getTime();
      filtered = filtered.filter((market) => {
        const endDate = new Date(market.end_date).getTime();
        const daysUntilEnd = (endDate - now) / (1000 * 60 * 60 * 24);
        return daysUntilEnd > 0 && daysUntilEnd <= 7;
      });
    }

    // Apply sort
    if (sortBy === "newest") {
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.created_at || a.end_date).getTime();
        const dateB = new Date(b.created_at || b.end_date).getTime();
        return dateB - dateA;
      });
    } else if (sortBy === "oldest") {
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.created_at || a.end_date).getTime();
        const dateB = new Date(b.created_at || b.end_date).getTime();
        return dateA - dateB;
      });
    } else if (sortBy === "ending-soon") {
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.end_date).getTime();
        const dateB = new Date(b.end_date).getTime();
        return dateA - dateB;
      });
    }

    return filtered;
  }, [allMarkets, activeFilter, sortBy]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && activeFilter === "all") {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, offset, activeFilter]);

  async function loadMore() {
    setLoading(true);
    try {
      // Call Server Action directly (no HTTP, no chunked encoding error!)
      const result = await listMarkets({
        resolved: false,
        limit: 20,
        offset: offset
      });

      if (result.success) {
        if (result.markets.length < 20) {
          setHasMore(false);
        }
        setAllMarkets(prev => [...prev, ...result.markets]);
        setOffset(prev => prev + 20);
      }
    } catch (error) {
      console.error("Error loading more markets:", error);
    } finally {
      setLoading(false);
    }
  }

  if (filteredAndSortedMarkets.length === 0) {
    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <MarketFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="px-3 py-2 bg-[#111111] border border-[#1f1f1f] rounded-lg text-sm text-white focus:outline-none focus:border-[#3b82f6]"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="ending-soon">Ending Soon</option>
          </select>
        </div>
        <div className="text-center py-12">
          <p className="text-[#9ca3af]">No markets available</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Filters and Sort */}
      <div className="flex items-center justify-between mb-6">
        <MarketFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortType)}
          className="px-3 py-2 bg-[#111111] border border-[#1f1f1f] rounded-lg text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="ending-soon">Ending Soon</option>
        </select>
      </div>

      {/* Markets Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedMarkets.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>
      
      {/* Intersection observer target for infinite scroll */}
      {activeFilter === "all" && (
        <div 
          ref={observerTarget} 
          className="h-20 flex items-center justify-center mt-8"
        >
          {loading && (
            <div className="text-[#9ca3af]">
              <div className="animate-pulse">Loading more markets...</div>
            </div>
          )}
          {!hasMore && allMarkets.length > 0 && (
            <p className="text-[#6b7280] text-sm">No more markets to load</p>
          )}
        </div>
      )}
    </>
  );
}
