import { listMarkets } from "@/actions";
import InfiniteMarketsList from "@/components/InfiniteMarketsList";
import Header from "@/components/Header";
import MainNavigation from "@/components/MainNavigation";
import FilterTagsWrapper from "@/components/FilterTagsWrapper";

// Force dynamic rendering - don't cache this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  // Server-side fetch initial data (SEO + fast initial load)
  const result = await listMarkets({ 
    resolved: false, 
    limit: 20,
    offset: 0 
  });

  const initialMarkets = result.success && result.markets ? result.markets : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <MainNavigation />
      {/* FilterTags temporarily disabled due to see-through issue */}
      {/* <FilterTagsWrapper markets={initialMarkets} /> */}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Markets list with filters and sort */}
        <InfiniteMarketsList initialMarkets={initialMarkets} />
      </div>
    </div>
  );
}
