// app/api/scan/route.js
// Production-grade scanner endpoint (Next.js App Router)
// - JSON stable schema (trading-software friendly)
// - Cache headers + optional Redis cache (Upstash / ioredis-like URL)
// - Rate limit (lightweight in-memory fallback + optional Redis counter)
// - Robust input validation + deterministic sorting
// - Safe error shape

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // <- fixes "couldn't be rendered statically"
export const revalidate = 0;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
  "x-content-type-options": "nosniff",
};

// -----------------------------
// Utils
// -----------------------------
function nowMs() {
  return Date.now();
}
function clampInt(v, min, max, def) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
function normStr(v, def = "") {
  if (typeof v !== "string") return def;
  return v.trim();
}
function safeNumber(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function pctToNumber(v) {
  // Accept number, "0.12", "0,12", "0.12%", "+0.12%"
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace("%", "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function json(data, status = 200, extraHeaders = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}
function errPayload(code, message, meta = {}) {
  return { ok: false, ts: nowMs(), error: { code, message, ...meta } };
}

// -----------------------------
// Optional Redis (Upstash REST / Redis URL)
// -----------------------------
// Support 2 ways without adding deps:
// 1) Upstash REST: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// 2) Redis URL via "REDIS_URL" but only if you install a client yourself.
// Here we implement Upstash REST (no deps).
async function redisGet(key) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const body = await res.json();
  // Upstash returns { result: "..." } or { result: null }
  return body?.result ?? null;
}

async function redisSetEX(key, ttlSeconds, value) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;

  const safeTtl = clampInt(ttlSeconds, 1, 3600, 60);
  const res = await fetch(
    `${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${safeTtl}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  return res.ok;
}

// -----------------------------
// Lightweight Rate Limit
// -----------------------------
// In production on serverless, in-memory is "best effort" only.
// If Upstash is configured, we also do a Redis-based counter.
const MEM_RL = globalThis.__ZILKARA_RL__ || (globalThis.__ZILKARA_RL__ = new Map());

function getClientIp(req) {
  // Vercel / proxies
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr.trim();
  return "unknown";
}

function memRateLimitHit(key, limit, windowMs) {
  const t = nowMs();
  const entry = MEM_RL.get(key) || { resetAt: t + windowMs, count: 0 };
  if (t > entry.resetAt) {
    entry.resetAt = t + windowMs;
    entry.count = 0;
  }
  entry.count += 1;
  MEM_RL.set(key, entry);

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
    count: entry.count,
  };
}

async function redisRateLimitHit(key, limit, windowSec) {
  // Upstash REST INCR + EXPIRE (no LUA, best effort)
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const incr = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!incr.ok) return null;
  const incrBody = await incr.json();
  const count = Number(incrBody?.result ?? 0);

  // set expiry every time (cheap, fine)
  await fetch(`${url}/expire/${encodeURIComponent(key)}/${encodeURIComponent(String(windowSec))}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => {});

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    count,
  };
}

// -----------------------------
// Data source: local JSON (stable fallback)
// -----------------------------
async function loadAssetsFromFile() {
  const fs = await import("fs/promises");
  const path = await import("path");

  const filePath = path.join(process.cwd(), "data", "assets.json");
  const stat = await fs.stat(filePath);
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw);

  // Accept either { data: [...] } or [...]
  const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
  return {
    assets: arr,
    fileMeta: {
      path: "data/assets.json",
      size_bytes: stat.size,
      mtime_ms: stat.mtimeMs,
    },
  };
}

function normalizeRow(row) {
  // Ensure a trading-software friendly, predictable schema
  const asset = normStr(row.asset || row.symbol || row.ticker || "");
  const symbol = normStr(row.symbol || row.asset || "");
  const price = safeNumber(row.price, null);

  const chg_24h_pct = pctToNumber(row.chg_24h_pct ?? row.change_24h ?? row.pct_24h ?? null);
  const chg_7d_pct = pctToNumber(row.chg_7d_pct ?? row.change_7d ?? row.pct_7d ?? null);
  const chg_30d_pct = pctToNumber(row.chg_30d_pct ?? row.change_30d ?? row.pct_30d ?? null);

  const stability_score = safeNumber(row.stability_score ?? row.score ?? null, null);
  const rating = normStr(row.rating ?? "", "");
  const regime = normStr(row.regime ?? row.regime_label ?? "", "");

  const rupture_rate = pctToNumber(row.rupture_rate ?? null);
  const similarity = safeNumber(row.similarity ?? null, null);
  const reason = normStr(row.reason ?? "", "") || null;

  const binance_url = normStr(row.binance_url ?? row.link ?? row.url ?? "", "") || null;

  // minimal validity checks
  if (!asset && !symbol) return null;

  return {
    asset: asset || symbol,
    symbol: symbol || asset,
    price,
    chg_24h_pct,
    chg_7d_pct,
    chg_30d_pct,
    stability_score,
    rating,
    regime,
    rupture_rate,
    similarity,
    reason,
    binance_url,
  };
}

function sortRows(rows, sortKey, sortDir) {
  const dir = sortDir === "asc" ? 1 : -1;

  const getter = (r) => {
    switch (sortKey) {
      case "asset":
        return (r.asset || "").toUpperCase();
      case "price":
        return r.price ?? -Infinity;
      case "chg_24h_pct":
        return r.chg_24h_pct ?? -Infinity;
      case "chg_7d_pct":
        return r.chg_7d_pct ?? -Infinity;
      case "chg_30d_pct":
        return r.chg_30d_pct ?? -Infinity;
      case "stability_score":
      default:
        return r.stability_score ?? -Infinity;
    }
  };

  return rows.sort((a, b) => {
    const va = getter(a);
    const vb = getter(b);

    if (typeof va === "string" && typeof vb === "string") {
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    }

    const na = Number(va);
    const nb = Number(vb);
    if (na < nb) return -1 * dir;
    if (na > nb) return 1 * dir;
    // stable tiebreaker
    const sa = (a.asset || "").toUpperCase();
    const sb = (b.asset || "").toUpperCase();
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return 0;
  });
}

// -----------------------------
// Handler
// -----------------------------
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: JSON_HEADERS });
}

export async function GET(req) {
  const t0 = nowMs();

  // ---- Rate limit (default: 60 req/min/ip)
  const ip = getClientIp(req);
  const limit = clampInt(process.env.RATE_LIMIT_PER_MIN, 10, 600, 60);
  const windowSec = clampInt(process.env.RATE_LIMIT_WINDOW_SEC, 10, 600, 60);

  // Prefer Redis RL if available, else mem RL
  const rlKey = `zilkara:rl:${ip}`;
  const redisRL = await redisRateLimitHit(rlKey, limit, windowSec).catch(() => null);
  const memRL = !redisRL ? memRateLimitHit(rlKey, limit, windowSec * 1000) : null;

  const allowed = redisRL ? redisRL.allowed : memRL.allowed;
  const remaining = redisRL ? redisRL.remaining : memRL.remaining;

  if (!allowed) {
    return json(
      errPayload("RATE_LIMITED", "Too many requests. Slow down.", {
        limit,
        window_sec: windowSec,
      }),
      429,
      {
        "retry-after": String(windowSec),
        "x-ratelimit-limit": String(limit),
        "x-ratelimit-remaining": String(0),
      }
    );
  }

  // ---- Query params
  const url = new URL(req.url);
  const qLimit = clampInt(url.searchParams.get("limit"), 1, 500, 250);
  const qOffset = clampInt(url.searchParams.get("offset"), 0, 100000, 0);

  const sort = normStr(url.searchParams.get("sort"), "stability_score");
  const dir = normStr(url.searchParams.get("dir"), "desc").toLowerCase() === "asc" ? "asc" : "desc";

  const regimeFilter = normStr(url.searchParams.get("regime"), "");
  const ratingFilter = normStr(url.searchParams.get("rating"), "");
  const minScore = safeNumber(url.searchParams.get("minScore"), null);
  const search = normStr(url.searchParams.get("q"), "");

  // ---- Cache (scan results often update on a schedule; TTL default 60s)
  const ttl = clampInt(process.env.SCAN_CACHE_TTL_SEC, 5, 600, 60);

  const cacheKey = `zilkara:scan:v1:${qLimit}:${qOffset}:${sort}:${dir}:${regimeFilter}:${ratingFilter}:${minScore ?? ""}:${search}`;
  const cached = await redisGet(cacheKey).catch(() => null);
  if (cached) {
    return json(JSON.parse(cached), 200, {
      "x-cache": "HIT",
      "x-ratelimit-remaining": String(remaining),
    });
  }

  // ---- Load data
  let fileMeta = null;
  let rawAssets = [];
  try {
    const file = await loadAssetsFromFile();
    rawAssets = file.assets;
    fileMeta = file.fileMeta;
  } catch (e) {
    // If file missing/invalid => hard fail (production should show explicit error)
    return json(
      errPayload("DATA_SOURCE_ERROR", "Unable to load assets data source.", {
        detail: String(e?.message || e),
      }),
      500,
      { "x-ratelimit-remaining": String(remaining) }
    );
  }

  // ---- Normalize + filter
  let rows = rawAssets
    .map(normalizeRow)
    .filter(Boolean);

  if (regimeFilter) {
    const rf = regimeFilter.toUpperCase();
    rows = rows.filter((r) => (r.regime || "").toUpperCase() === rf);
  }
  if (ratingFilter) {
    const rtf = ratingFilter.toUpperCase();
    rows = rows.filter((r) => (r.rating || "").toUpperCase() === rtf);
  }
  if (minScore !== null) {
    rows = rows.filter((r) => (r.stability_score ?? -Infinity) >= minScore);
  }
  if (search) {
    const s = search.toUpperCase();
    rows = rows.filter((r) => (r.asset || "").toUpperCase().includes(s) || (r.symbol || "").toUpperCase().includes(s));
  }

  // ---- Sort + paginate
  rows = sortRows(rows, sort, dir);

  const total = rows.length;
  const page = rows.slice(qOffset, qOffset + qLimit);

  // ---- Output schema (stable, trading-friendly)
  const payload = {
    ok: true,
    ts: nowMs(),
    meta: {
      updatedAt: fileMeta?.mtime_ms ?? null,
      source: "file:data/assets.json",
      count: total,
      limit: qLimit,
      offset: qOffset,
      sort,
      dir,
      filters: {
        regime: regimeFilter || null,
        rating: ratingFilter || null,
        minScore: minScore ?? null,
        q: search || null,
      },
      file: fileMeta,
      latency_ms: nowMs() - t0,
    },
    data: page,
  };

  // ---- Cache store
  await redisSetEX(cacheKey, ttl, JSON.stringify(payload)).catch(() => {});

  return json(payload, 200, {
    "x-cache": "MISS",
    "x-ratelimit-remaining": String(remaining),
    "x-scan-ttl": String(ttl),
  });
}

