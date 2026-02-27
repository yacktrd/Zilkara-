// lib/sort.ts
import type { ScanAsset, SortMode } from "./types";

export function sortAssets(list: ScanAsset[], sort: SortMode) {
  const arr = [...list];

  const tie = (a: ScanAsset, b: ScanAsset) => {
    // stable tie-breakers to prevent UI “jumping”
    const amc = a.market_cap ?? -1;
    const bmc = b.market_cap ?? -1;
    if (bmc !== amc) return bmc - amc;

    const av = a.volume_24h ?? -1;
    const bv = b.volume_24h ?? -1;
    if (bv !== av) return bv - av;

    return a.symbol.localeCompare(b.symbol);
  };

  arr.sort((a, b) => {
    switch (sort) {
      case "rank_desc": {
        const d = (b.rank_score ?? -1) - (a.rank_score ?? -1);
        return d !== 0 ? d : tie(a, b);
      }
      case "rank_asc": {
        const d = (a.rank_score ?? -1) - (b.rank_score ?? -1);
        return d !== 0 ? d : tie(a, b);
      }
      case "price_desc": {
        const d = (b.price_eur ?? -1) - (a.price_eur ?? -1);
        return d !== 0 ? d : tie(a, b);
      }
      case "price_asc": {
        const d = (a.price_eur ?? -1) - (b.price_eur ?? -1);
        return d !== 0 ? d : tie(a, b);
      }
      default:
        return tie(a, b);
    }
  });

  return arr;
}
