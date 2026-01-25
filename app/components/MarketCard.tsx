import Link from "next/link";

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

export default function MarketCard({ market }: Props) {
  // Fake probability data (50/50 default, will be calculated from orders later)
  const yesProbability = 50;
  const noProbability = 50;
  
  // Fake volume data (will be calculated from trades later)
  const volume = Math.floor(Math.random() * 5000000) + 10000; // $10k - $5m
  
  const isNew = isNewMarket(market.created_at);
  const daysUntilEnd = Math.ceil(
    (new Date(market.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Link
      href={`/markets/${market.id}`}
      className="block p-5 bg-[#111111] border border-[#1f1f1f] rounded-lg card-hover"
    >
      {/* Header with category and NEW badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="px-2.5 py-1 bg-[#1f1f1f] text-[#9ca3af] text-xs font-medium rounded-md uppercase tracking-wide">
          {market.category}
        </span>
        {isNew && (
          <span className="px-2 py-0.5 bg-[#3b82f6] text-white text-xs font-semibold rounded">
            NEW
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 leading-snug">
        {market.title}
      </h3>

      {/* Probability bars */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#10b981]">Yes</span>
            <span className="text-xs font-bold text-white">{yesProbability}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">{noProbability}%</span>
            <span className="text-xs font-medium text-[#ef4444]">No</span>
          </div>
        </div>
        <div className="probability-bar flex">
          <div 
            className="probability-bar-fill probability-bar-yes"
            style={{ width: `${yesProbability}%` }}
          />
          <div 
            className="probability-bar-fill probability-bar-no"
            style={{ width: `${noProbability}%` }}
          />
        </div>
      </div>

      {/* Footer with volume and end date */}
      <div className="flex items-center justify-between text-xs pt-3 border-t border-[#1f1f1f]">
        <span className="text-[#3b82f6] font-semibold">
          {formatVolume(volume)} Vol.
        </span>
        <span className="text-[#6b7280]">
          {daysUntilEnd > 0 ? `${daysUntilEnd}d left` : 'Ending soon'}
        </span>
      </div>
    </Link>
  );
}
