// app/api/scan/route.ts
import { NextResponse } from "next/server";

type Regime = "STABLE" | "TRANSITION" | "VOLATILE" | string;

type Trend = "up" | "down" | null;

export type ScanAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;

  market_cap: number | null;
  volume_24h: number | null;

  confidence_score: number | null;
  regime: Regime | null;

  score_delta: number | null;
  score_trend: Trend;

  binance_url: string | null;
  affiliate_url: string | null;

  // Debug-friendly (optionnel)
  liquidity_ratio: number | null; // volume_24h / market_cap
};

type ScanResponse = {
  ok: boolean;
  ts: string;
  source: "scan" | "fallback";
  market: string;
  quote: string;
  mode: "include" | "exclude";
  count: number;
  data: ScanAsset[];
  market_regime: Regime;
  confidence_global: number | null;
  stable_ratio: number;
  transition_ratio: number;
  volatile_ratio: number;
  message: string | null;
  error?: string;
};

const NOW_ISO = () => new Date().toISOString();

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const safeNum = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const safeStr = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

const upper = (s: string) => s.trim().toUpperCase();

function toBinancePair(symbol: string, quote: string) {
  return `${upper(symbol)}${upper(quote)}`;
}

function makeBinanceUrls(symbol: string, quote: string) {
  const pair = toBinancePair(symbol, quote);
  const binance_url = `https://www.binance.com/en/trade/${pair}`;
  // ✅ mets ton ref exact dans VERCEL env si tu veux
  const ref = process.env.BINANCE_REF?.trim();
  const affiliate_url = ref ? `https://www.binance.com/en/trade/${pair}?ref=${encodeURIComponent(ref)}` : binance_url;
  return { binance_url, affiliate_url };
}

/**
 * Stablecoin list (mode=exclude)
 * - volontairement minimal + extensible
 */
const STABLECOINS = new Set([
  "USDT",
  "USDC",
  "DAI",
  "TUSD",
  "FDUSD",
  "PYUSD",
  "USDE",
  "FRAX",
  "LUSD",
  "BUSD",
]);

/**
 * V3 tuning (safe defaults)
 * Tu peux override via Vercel env vars si besoin.
 */
const CFG = {
  // micro-cap filter/penalty
  MICRO_CAP_USD: Number(process.env.MICRO_CAP_USD ?? 50_000_000), // 50M
  SMALL_CAP_USD: Number(process.env.SMALL_CAP_USD ?? 200_000_000), // 200M

  // liquidity ratio thresholds
  LIQ_RATIO_GOOD: Number(process.env.LIQ_RATIO_GOOD ?? 0.20), // vol/mcap >= 0.20 très liquide
  LIQ_RATIO_OK: Number(process.env.LIQ_RATIO_OK ?? 0.05), // >= 0.05 acceptable

  // regime thresholds (abs 24h)
  STABLE_ABS_24H: Number(process.env.STABLE_ABS_24H ?? 0.8),
  VOLATILE_ABS_24H: Number(process.env.VOLATILE_ABS_24H ?? 3.0),

  // scoring weights
  W_24H: Number(process.env.W_24H ?? 0.55),
  W_7D: Number(process.env.W_7D ?? 0.45),
};

function computeLiquidityRatio(volume24h: number | null, marketCap: number | null): number | null {
  if (!volume24h || !marketCap || marketCap <= 0) return null;
  return volume24h / marketCap;
}

function computeAssetRegime(chg24h: number | null): Regime | null {
  if (chg24h == null) return null;
  const a = Math.abs(chg24h);
  if (a <= CFG.STABLE_ABS_24H) return "STABLE";
  if (a >= CFG.VOLATILE_ABS_24H) return "VOLATILE";
  return "TRANSITION";
}

function penaltyMicroCap(marketCap: number | null): number {
  if (!marketCap) return 0;
  if (marketCap < CFG.MICRO_CAP_USD) return 18; // très pénalisant
  if (marketCap < CFG.SMALL_CAP_USD) return 8;  // pénalité douce
  return 0;
}

function bonusLiquidity(liqRatio: number | null): number {
  if (liqRatio == null) return 0;
  if (liqRatio >= CFG.LIQ_RATIO_GOOD) return 10;
  if (liqRatio >= CFG.LIQ_RATIO_OK) return 5;
  return 0;
}

/**
 * Momentum scoring : on veut privilégier la zone exploitable, pas la folie.
 * - 24h : idéal ~ 1–3%
 * - 7d : idéal ~ 3–12% (signal de tendance)
 */
function scoreMomentum24h(chg24h: number | null): number {
  if (chg24h == null) return 0;
  const a = Math.abs(chg24h);

  // sweet spot 1–3%
  if (a >= 1 && a <= 3) return 55;
  if (a > 3 && a <= 6) return 45;
  if (a > 6 && a <= 10) return 30;
  if (a > 10) return 15;

  // trop plat
  if (a >= 0.3 && a < 1) return 35;
  return 20;
}

function scoreMomentum7d(chg7d: number | null): number {
  if (chg7d == null) return 0;
  const a = Math.abs(chg7d);

  // sweet spot 3–12%
  if (a >= 3 && a <= 12) return 45;
  if (a > 12 && a <= 25) return 35;
  if (a > 25) return 20;

  if (a >= 1 && a < 3) return 30;
  return 18;
}

/**
 * Pondération selon régime global
 * - STABLE global: on préfère 24h faible, scoring plus strict
 * - VOLATILE global: on valorise la liquidité + momentum (mais microcap punie)
 * - TRANSITION: neutre
 */
function regimeWeight(globalRegime: Regime): { w24: number; w7d: number; liqBoost: number } {
  if (globalRegime === "STABLE") return { w24: 0.65, w7d: 0.35, liqBoost: 0.8 };
  if (globalRegime === "VOLATILE") return { w24: 0.50, w7d: 0.50, liqBoost: 1.1 };
  return { w24: CFG.W_24H, w7d: CFG.W_7D, liqBoost: 1.0 };
}

function computeConfidenceV3(
  chg24h: number | null,
  chg7d: number | null,
  liqRatio: number | null,
  marketCap: number | null,
  globalRegime: Regime
): number | null {
  // base components
  const m24 = scoreMomentum24h(chg24h);
  const m7d = scoreMomentum7d(chg7d);

  const w = regimeWeight(globalRegime);

  const base = (m24 * w.w24) + (m7d * w.w7d);
  const liq = bonusLiquidity(liqRatio) * w.liqBoost;
  const micro = penaltyMicroCap(marketCap);

  // cap penalties if data missing
  const missingPenalty =
    (chg24h == null ? 10 : 0) +
    (marketCap == null ? 8 : 0) +
    (liqRatio == null ? 6 : 0);

  const raw = base + liq - micro - missingPenalty;

  return clamp(Math.round(raw), 0, 100);
}

function computeMarketRegime(stats: { stable: number; transition: number; volatile: number; total: number }): Regime {
  if (stats.total <= 0) return "TRANSITION";
  const s = stats.stable / stats.total;
  const t = stats.transition / stats.total;
  const v = stats.volatile / stats.total;

  // règle simple et stable
  if (v >= 0.45) return "VOLATILE";
  if (s >= 0.55) return "STABLE";
  // sinon transition
  if (t >= 0.35) return "TRANSITION";
  return "TRANSITION";
}

function computeGlobalConfidence(data: ScanAsset[]): number | null {
  const scores = data.map((x) => x.confidence_score).filter((n): n is number => typeof n === "number");
  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return clamp(Math.round(avg), 0, 100);
}

function normalizeRaw(raw: any, quote: string): Omit<ScanAsset, "confidence_score" | "regime" | "score_delta" | "score_trend"> | null {
  const symbol = safeStr(raw?.symbol) ?? safeStr(raw?.id);
  if (!symbol) return null;

  const name = safeStr(raw?.name) ?? symbol;

  const price = safeNum(raw?.price);
  const chg_24h_pct = safeNum(raw?.chg_24h_pct);
  const chg_7d_pct = safeNum(raw?.chg_7d_pct);

  const market_cap = safeNum(raw?.market_cap);
  const volume_24h = safeNum(raw?.volume_24h);

  const q = quote === "USD" ? "USDT" : quote;
  const api_binance = safeStr(raw?.binance_url);
  const api_aff = safeStr(raw?.affiliate_url);

  const urls = api_binance || api_aff
    ? { binance_url: api_binance ?? null, affiliate_url: api_aff ?? api_binance ?? null }
    : makeBinanceUrls(symbol, q);

  const liqRatio = computeLiquidityRatio(volume_24h, market_cap);

  return {
    id: safeStr(raw?.id) ?? upper(symbol),
    symbol: upper(symbol),
    name,

    price,
    chg_24h_pct,
    chg_7d_pct,

    market_cap,
    volume_24h,

    liquidity_ratio: liqRatio,

    binance_url: urls.binance_url,
    affiliate_url: urls.affiliate_url,
  };
}

/**
 * ✅ Branche ton vrai pipeline ici (KV / CoinGecko / autre)
 * IMPORTANT: ce handler doit rester stable même si ça tombe.
 */
async function getRawUniverse(_market: string, _quote: string): Promise<any[]> {
  // TODO: impl real provider
  return [];
}

/**
 * Fallback minimal (utile si provider down) — conforme à ton UI modèle.
 * Note: chg_7d_pct est approximatif ici (placeholder).
 */
function fallbackUniverse(quote: string): any[] {
  return [
    { id: "BTC", symbol: "BTC", name: "Bitcoin", price: 64456, chg_24h_pct: 0.03, chg_7d_pct: 2.4, market_cap: 0, volume_24h: 0 },
    { id: "ETH", symbol: "ETH", name: "Ethereum", price: 1853, chg_24h_pct: 0.13, chg_7d_pct: 4.2, market_cap: 0, volume_24h: 0 },
    { id: "SOL", symbol: "SOL", name: "Solana", price: 149.07, chg_24h_pct: 3.42, chg_7d_pct: 9.8, market_cap: 0, volume_24h: 0 },
  ].map((x) => ({
    ...x,
    binance_url: makeBinanceUrls(x.symbol, quote === "USD" ? "USDT" : quote).binance_url,
    affiliate_url: makeBinanceUrls(x.symbol, quote === "USD" ? "USDT" : quote).affiliate_url,
  }));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const quote = upper(url.searchParams.get("quote") || "USD");
    const market = (url.searchParams.get("market") || "crypto").toLowerCase();

    // mode=exclude → retire stablecoins de l’univers
    const mode = (url.searchParams.get("mode") || "include").toLowerCase() === "exclude" ? "exclude" : "include";

    // récup data brute
    let source: "scan" | "fallback" = "scan";
    let raw = await getRawUniverse(market, quote);
    if (!Array.isArray(raw) || raw.length === 0) {
      raw = fallbackUniverse(quote);
      source = "fallback";
    }

    // normalize
    const base = raw
      .map((x) => normalizeRaw(x, quote))
      .filter((x): x is NonNullable<ReturnType<typeof normalizeRaw>> => x != null);

    // exclude stablecoins
    const filtered = mode === "exclude"
      ? base.filter((x) => !STABLECOINS.has(x.symbol))
      : base;

    // pass 1: compute per-asset regime (pre global)
    const regimes = filtered.map((x) => computeAssetRegime(x.chg_24h_pct));
    const stats = regimes.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r === "STABLE") acc.stable += 1;
        else if (r === "VOLATILE") acc.volatile += 1;
        else acc.transition += 1;
        return acc;
      },
      { stable: 0, transition: 0, volatile: 0, total: 0 }
    );

    const market_regime = computeMarketRegime(stats);

    // pass 2: compute confidence with market regime weighting
    const enriched: ScanAsset[] = filtered.map((x) => {
      const regime = computeAssetRegime(x.chg_24h_pct);
      const confidence = computeConfidenceV3(
        x.chg_24h_pct,
        x.chg_7d_pct,
        x.liquidity_ratio,
        x.market_cap,
        market_regime
      );

      // score delta/trend: placeholders stables (future: compare with KV yesterday)
      const score_delta: number | null = null;
      const score_trend: Trend = null;

      return {
        ...x,
        confidence_score: confidence,
        regime,
        score_delta,
        score_trend,
      };
    });

    // tri: score desc (par défaut)
    enriched.sort((a, b) => (b.confidence_score ?? -1) - (a.confidence_score ?? -1));

    // compute global confidence
    const confidence_global = computeGlobalConfidence(enriched);

    const stable_ratio = stats.total ? stats.stable / stats.total : 0;
    const transition_ratio = stats.total ? stats.transition / stats.total : 0;
    const volatile_ratio = stats.total ? stats.volatile / stats.total : 0;

    const res: ScanResponse = {
      ok: true,
      ts: NOW_ISO(),
      source,
      market,
      quote,
      mode,
      count: enriched.length,
      data: enriched,

      market_regime,
      confidence_global,
      stable_ratio,
      transition_ratio,
      volatile_ratio,

      message: null,
    };

    return NextResponse.json(res, { status: 200 });
  } catch (e: any) {
    const res: ScanResponse = {
      ok: false,
      ts: NOW_ISO(),
      source: "scan",
      market: "crypto",
      quote: "USD",
      mode: "include",
      count: 0,
      data: [],
      market_regime: "TRANSITION",
      confidence_global: null,
      stable_ratio: 0,
      transition_ratio: 0,
      volatile_ratio: 0,
      message: "scan_failed",
      error: e?.message ?? "Unknown error",
    };
    return NextResponse.json(res, { status: 500 });
  }
}
