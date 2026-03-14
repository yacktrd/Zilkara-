// lib/xyvala/mappers/scan-mapper.ts

import type { ScanAsset, Regime } from "@/lib/xyvala/scan";
import type { ScanServiceItem } from "@/lib/xyvala/services/scan-service";

/**
 * Xyvala Scan Mapper
 *
 * Rôle :
 * convertir un objet service tolérant aux nulls
 * vers un objet UI strict et cohérent avec ScanAsset.
 */

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function safeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeRegime(value: unknown): Regime {
  const regime = safeString(value).toUpperCase();

  if (regime === "STABLE") return "STABLE";
  if (regime === "TRANSITION") return "TRANSITION";
  if (regime === "VOLATILE") return "VOLATILE";

  return "TRANSITION";
}

export function mapScanServiceItemToAsset(item: ScanServiceItem): ScanAsset {
  return {
    id: safeString(item.id, safeString(item.symbol, "unknown").toLowerCase()),
    symbol: safeString(item.symbol, "UNKNOWN"),
    name: safeString(item.name, safeString(item.symbol, "Unknown")),

    price: safeNumber(item.price, 0),
    chg_24h_pct: safeNumber(item.chg_24h_pct, 0),
    confidence_score: safeNumber(item.confidence_score, 0),

    regime: normalizeRegime(item.regime),

    binance_url: safeString(item.binance_url, "#"),
    affiliate_url: safeString(item.affiliate_url ?? item.binance_url, "#"),

    market_cap: safeOptionalNumber(item.market_cap),
    volume_24h: safeOptionalNumber(item.volume_24h),

  };
}

export function mapScanServiceItems(items: ScanServiceItem[]): ScanAsset[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapScanServiceItemToAsset);
}
