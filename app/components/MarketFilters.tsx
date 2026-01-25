"use client";

interface Props {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { id: "all", label: "All" },
  { id: "trending", label: "Trending" },
  { id: "popular", label: "Popular" },
  { id: "ending-soon", label: "Ending Soon" },
];

export default function MarketFilters({ activeFilter, onFilterChange }: Props) {
  return (
    <div className="flex items-center gap-1 border-b border-[#1f1f1f] mb-6">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeFilter === filter.id
              ? "tab-active"
              : "tab-inactive"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
