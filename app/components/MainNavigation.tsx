"use client";

import { useState } from "react";

const categories = [
  "Trending",
  "Breaking",
  "New",
  "Politics",
  "Sports",
  "Crypto",
  "Finance",
  "Geopolitics",
  "Earnings",
  "Tech",
  "Culture",
  "World",
  "Economy",
  "Climate & Science",
  "Elections",
  "More",
];

export default function MainNavigation() {
  const [activeCategory, setActiveCategory] = useState("Trending");

  return (
    <nav className="bg-[#0D1117] border-b border-[#30363D] sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 min-w-max">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                  activeCategory === category
                    ? "text-white"
                    : "text-[#C9D1D9] hover:text-white"
                }`}
              >
                {category}
                {activeCategory === category && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3b82f6]"></span>
                )}
                {category === "More" && (
                  <svg
                    className="inline-block ml-1 w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
