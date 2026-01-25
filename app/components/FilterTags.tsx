"use client";

import { useState, useMemo } from "react";

interface Market {
  category: string;
}

interface Props {
  markets?: Market[];
  activeTag: string;
  onTagChange: (tag: string) => void;
}

export default function FilterTags({ markets = [], activeTag, onTagChange }: Props) {
  // Extract unique categories from markets for dynamic tags
  const dynamicTags = useMemo(() => {
    const categories = new Set(markets.map((m) => m.category));
    return Array.from(categories).slice(0, 10); // Limit to 10 tags
  }, [markets]);

  const defaultTags = ["All", ...dynamicTags];

  return (
    <div className="bg-[#0a0a0a] border-b border-[#1f1f1f] sticky top-[8rem] z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-3">
          {/* Filter Tags - Scrollable */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
            {defaultTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagChange(tag)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  activeTag === tag
                    ? "bg-[#3b82f6] text-white"
                    : "bg-[#111111] text-[#9ca3af] hover:bg-[#1f1f1f] hover:text-white"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Search Icon */}
            <button
              className="p-2 text-[#9ca3af] hover:text-white transition-colors"
              aria-label="Search"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Filter Icon */}
            <button
              className="p-2 text-[#9ca3af] hover:text-white transition-colors"
              aria-label="Filter"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>

            {/* Bookmark Icon */}
            <button
              className="p-2 text-[#9ca3af] hover:text-white transition-colors"
              aria-label="Bookmarks"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
      </div>
    </div>
  );
}
