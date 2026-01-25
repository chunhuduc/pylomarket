import { listMarkets } from "@/actions";
import InfiniteMarketsList from "@/components/InfiniteMarketsList";

export default async function Home() {
  // Server-side fetch initial data (SEO + fast initial load)
  const result = await listMarkets({ 
    resolved: false, 
    limit: 20,
    offset: 0 
  });

  console.log('[DEBUG page.tsx] listMarkets result:', {
    success: result.success,
    marketsCount: result.markets?.length || 0,
    hasMarkets: !!result.markets && result.markets.length > 0,
    error: result.error,
  });

  const initialMarkets = result.success && result.markets ? result.markets : [];
  console.log('[DEBUG page.tsx] initialMarkets count:', initialMarkets.length);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            Prediction Markets
          </h1>
          <p className="text-[#9ca3af] text-lg">
            Trade on the outcome of future events
          </p>
        </div>

        {/* Markets list with filters and sort */}
        <InfiniteMarketsList initialMarkets={initialMarkets} />
      </div>
    </div>
  );
}
