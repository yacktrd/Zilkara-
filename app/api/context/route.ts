// app/api/context/route.ts
import { NextResponse } from "next/server";

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";

type ScanAsset = {
  id?: string;
  symbol?: string;
  name?: string;
  price?: number;
  chg_24h_pct?: number;
  regime?: Regime | string;
  confidence_score?: number;
};

type ScanResponse = {
  ok?: boolean;
  ts?: string;
  market?: string;
  quote?: string;
  count?: number;
  data?: ScanAsset[];
  items?: ScanAsset[]; // tolère ton ancien format
  error?: string;
  message?: string;
  meta?: any;
};

type ContextResponse = {
  ok: boolean;
  ts: string;
  source: "scan" | "fallback";
  market: "crypto";
  quote: "usd";
  market_regime: Regime;
  confidence_global: number; // 0-100
  stable_ratio: number; // 0-1
  transition_ratio: number; // 0-1
  volatile_ratio: number; // 0-1
  meta: {
    scan_url?: string;
    scan_count?: number;
    generated_at: string;
    cache: "no-store";
  };
  error?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toNum(v: any, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRegime(v: any): Regime {
  const s = String(v ?? "").toUpperCase().trim();
  if (s === "STABLE") return "STABLE";
  if (s === "TRANSITION") return "TRANSITION";
  if (s === "VOLATILE") return "VOLATILE";
  return "TRANSITION";
}

function safeJson<T>(v: any, fallback: T): T {
  try {
    return v as T;
  } catch {
    return fallback;
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function computeContextFromAssets(assets: ScanAsset[]) {
  const total = assets.length;

  if (!total) {
    return {
      market_regime: "TRANSITION" as Regime,
      confidence_global: 0,
      stable_ratio: 0,
      transition_ratio: 0,
      volatile_ratio: 0,
    };
  }

  let stable = 0;
  let transition = 0;
  let volatile = 0;

  let sumScore = 0;
  let scoreCount = 0;

  for (const a of assets) {
    const r = normalizeRegime(a.regime);
    if (r === "STABLE") stable++;
    else if (r === "VOLATILE") volatile++;
    else transition++;

    const s = toNum(a.confidence_score, NaN);
    if (Number.isFinite(s)) {
      sumScore += clamp(s, 0, 100);
      scoreCount++;
    }
  }

  const stable_ratio = stable / total;
  const transition_ratio = transition / total;
  const volatile_ratio = volatile / total;

  // moyenne des scores (fallback = 0 si aucun score)
  const confidence_global =
    scoreCount > 0 ? Math.round(sumScore / scoreCount) : 0;

  // régime global = majorité
  let market_regime: Regime = "TRANSITION";
  if (stable_ratio >= transition_ratio && stable_ratio >= volatile_ratio) {
    market_regime = "STABLE";
  } else if (
    volatile_ratio >= stable_ratio &&
    volatile_ratio >= transition_ratio
  ) {
    market_regime = "VOLATILE";
  } else {
    market_regime = "TRANSITION";
  }

  return {
    market_regime,
    confidence_global: clamp(confidence_global, 0, 100),
    stable_ratio: clamp(stable_ratio, 0, 1),
    transition_ratio: clamp(transition_ratio, 0, 1),
    volatile_ratio: clamp(volatile_ratio, 0, 1),
  };
}

export async function GET(req: Request) {
  const ts = new Date().toISOString();

  // V1: contexte calculé depuis /api/scan côté serveur
  // -> pas dépendant du front
  const baseUrl = new URL(req.url);
  const origin = baseUrl.origin;

  // On prend assez large pour que les ratios soient représentatifs
  const scanUrl = `${origin}/api/scan?limit=200&sort=confidence_score_desc`;

  try {
    const res = await fetchWithTimeout(scanUrl, 8000);

    if (!res.ok) {
      const out: ContextResponse = {
        ok: false,
        ts,
        source: "fallback",
        market: "crypto",
        quote: "usd",
        market_regime: "TRANSITION",
        confidence_global: 0,
        stable_ratio: 0,
        transition_ratio: 0,
        volatile_ratio: 0,
        meta: {
          scan_url: scanUrl,
          scan_count: 0,
          generated_at: ts,
          cache: "no-store",
        },
        error: `Context fetch failed (scan status ${res.status})`,
      };

      return NextResponse.json(out, {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const json = safeJson<ScanResponse>(await res.json(), {});
    const list = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.items)
      ? json.items
      : [];

    const computed = computeContextFromAssets(list);

    const out: ContextResponse = {
      ok: true,
      ts,
      source: "scan",
      market: "crypto",
      quote: "usd",
      ...computed,
      meta: {
        scan_url: scanUrl,
        scan_count: list.length,
        generated_at: ts,
        cache: "no-store",
      },
    };

    return NextResponse.json(out, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    const out: ContextResponse = {
      ok: false,
      ts,
      source: "fallback",
      market: "crypto",
      quote: "usd",
      market_regime: "TRANSITION",
      confidence_global: 0,
      stable_ratio: 0,
      transition_ratio: 0,
      volatile_ratio: 0,
      meta: {
        scan_url: scanUrl,
        scan_count: 0,
        generated_at: ts,
        cache: "no-store",
      },
      error:
        err?.name === "AbortError"
          ? "Context fetch timeout (scan)"
          : "Context computation failed",
    };

    return NextResponse.json(out, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

