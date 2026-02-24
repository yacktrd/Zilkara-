// lib/state.ts

export type StateAsset = {
  symbol: string;
  name?: string;
  price: number;
  chg_24h_pct: number;
  confidence_score: number;
  regime: string;
  binance_url?: string;
  affiliate_url?: string;
};

/**
 * Lecture KV via REST (Upstash/Vercel KV REST).
 * - nécessite: KV_REST_API_URL + KV_REST_API_TOKEN
 * - la data doit être stockée en JSON (string) dans une clé "state".
 */
async function kvGet(key: string): Promise<any | null> {
  const base = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();

  if (!base || !token) return null;

  // Upstash REST: GET {base}/get/{key}
  const url = `${base.replace(/\/$/, "")}/get/${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  // Upstash format: { result: <value> }
  return data?.result ?? null;
}

function asArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  if (raw && Array.isArray(raw.assets)) return raw.assets;
  return [];
}

function toNum(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function normalize(x: any): StateAsset | null {
  const symbol = toStr(x?.symbol ?? x?.ticker ?? x?.pair).trim().toUpperCase();
  if (!symbol) return null;

  const name = toStr(x?.name ?? x?.asset_name ?? x?.fullname).trim() || symbol;

  // tolère différents noms
  const price = toNum(x?.price ?? x?.last ?? x?.last_price, 0);

  const chg_24h_pct = toNum(
    x?.chg_24h_pct ?? x?.chg_24h_pct ?? x?.change_24h_pct ?? x?.pct_24h ?? x?.priceChangePercent,
    0
  );

  const confidence_score = toNum(
    x?.confidence_score ?? x?.confidence ?? x?.score ?? x?.score_confidence,
    0
  );

  const regime = toStr(x?.regime ?? x?.market_regime ?? x?.context_regime).trim() || "UNKNOWN";

  const binance_url = toStr(x?.binance_url ?? x?.trade_url ?? x?.url).trim() || undefined;
  const affiliate_url = toStr(x?.affiliate_url ?? x?.binance_affiliate_url).trim() || undefined;

  return { symbol, name, price, chg_24h_pct, confidence_score, regime, binance_url, affiliate_url };
}

export async function getStateData(): Promise<StateAsset[]> {
  // 🔒 clé configurable, sinon on tente plusieurs clés courantes
  const mainKey = process.env.STATE_KV_KEY?.trim();
  const candidates = [
    mainKey,
    "state",
    "rfs:state",
    "rfs:state:24h",
    "scan:state",
    "scan:last",
    "market:state",
  ].filter(Boolean) as string[];

  let raw: any = null;

  for (const key of candidates) {
    const v = await kvGet(key);
    if (v == null) continue;

    // v peut être déjà un objet/array OU une string JSON
    if (typeof v === "string") {
      const parsed = JSON.parse(v);
      raw = parsed;
    } else {
      raw = v;
    }

    // si on a quelque chose de non vide, stop
    const arr = asArray(raw);
    if (arr.length > 0) break;
  }

  const arr = asArray(raw);

  // normalize + drop invalid
  const items = arr.map(normalize).filter(Boolean) as StateAsset[];

  // si KV vide → renvoie [] (pas de placeholder)
  // limite dure à 50 (si tu veux)
  return items.slice(0, 50);
}
