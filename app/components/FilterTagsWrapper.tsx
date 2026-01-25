"use client";

import { useState, useEffect } from "react";
import FilterTags from "./FilterTags";

interface Market {
  category: string;
}

interface Props {
  markets: Market[];
}

export default function FilterTagsWrapper({ markets }: Props) {
  const [activeTag, setActiveTag] = useState("All");

  const handleTagChange = (tag: string) => {
    setActiveTag(tag);
    // Dispatch custom event for InfiniteMarketsList to listen
    window.dispatchEvent(new CustomEvent('filterTagChange', { detail: tag }));
  };

  return <FilterTags markets={markets} activeTag={activeTag} onTagChange={handleTagChange} />;
}
