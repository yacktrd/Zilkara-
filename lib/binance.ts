// lib/binance.ts
import { safeStr, upperSymbol } from "./utils";

export function buildBinanceUrl(symbol: string) {
  const s = upperSymbol(symbol);
  if (!s) return "https://www.binance.com/en/markets";
  // Binance “trade” page uses e.g. BTCUSDT. (Still can 404 if pair not listed; URL is never empty.)
  return `https://www.binance.com/en/trade/${encodeURIComponent(s)}USDT?_from=markets`;
}

export function buildAffiliateUrl(binanceUrl: string) {
  // Optional: provide BINANCE_AFFILIATE_REF in Vercel env.
  const ref = safeStr(process.env.BINANCE_AFFILIATE_REF);
  if (!ref) return undefined;

  try {
    const u = new URL(binanceUrl);
    if (!u.searchParams.get("ref")) u.searchParams.set("ref", ref);
    return u.toString();
  } catch {
    return undefined;
  }
}
