import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

/*
ZILKARA SCAN ENDPOINT — PRODUCTION CORE
Compatible :
- logiciel trading
- Redis cache
- Vercel serverless
- mobile frontend
*/

// ============================
// CONFIG
// ============================

const CACHE_TTL_MS = 60_000; // 60s cache mémoire
const REDIS_KEY = "scan:latest";

const redis =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// ============================
// CACHE MÉMOIRE
// ============================

let memoryCache = {
  ts: 0,
  data: null,
};

// ============================
// LOG STRUCTURÉ
// ============================

function log(event, payload = {}) {
  console.log(
    JSON.stringify({
      service: "zilkara-scan",
      event,
      ts: Date.now(),
      ...payload,
    })
  );
}

// ============================
// FORMAT ERREUR STANDARD
// ============================

function errorResponse(code, message, hint = null, retry_after = null) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code,
        message,
        hint,
        retry_after,
      },
      ts: Date.now(),
    }),
    {
      status: code,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ============================
// VALIDATION STRUCTURE
// ============================

function validateScan(scan) {
  if (!scan) return false;
  if (!scan.data) return false;
  if (!Array.isArray(scan.data)) return false;
  return true;
}

// ============================
// LOAD FROM REDIS
// ============================

async function loadFromRedis() {
  if (!redis) return null;

  try {
    const data = await redis.get(REDIS_KEY);
    return data;
  } catch (e) {
    log("redis_read_error", { error: e.message });
    return null;
  }
}

// ============================
// LOAD FROM FILE FALLBACK
// ============================

async function loadFromFile() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/data/assets.json`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;

    const json = await res.json();

    return {
      ok: true,
      ts: Date.now(),
      data: json.assets,
      updatedAt: json.updatedAt,
      count: json.count,
    };
  } catch {
    return null;
  }
}

// ============================
// MAIN HANDLER
// ============================

export async function GET() {
  const start = Date.now();

  try {
    // ========================
    // MEMORY CACHE HIT
    // ========================

    if (
      memoryCache.data &&
      Date.now() - memoryCache.ts < CACHE_TTL_MS
    ) {
      log("cache_hit_memory", {
        latency: Date.now() - start,
        count: memoryCache.data.count,
      });

      return Response.json(memoryCache.data);
    }

    // ========================
    // REDIS CACHE HIT
    // ========================

    const redisData = await loadFromRedis();

    if (validateScan(redisData)) {
      memoryCache = {
        ts: Date.now(),
        data: redisData,
      };

      log("cache_hit_redis", {
        latency: Date.now() - start,
        count: redisData.count,
      });

      return Response.json(redisData);
    }

    // ========================
    // FILE FALLBACK
    // ========================

    const fileData = await loadFromFile();

    if (!validateScan(fileData)) {
      return errorResponse(
        500,
        "SCAN_DATA_INVALID",
        "Check pipeline and Redis sync",
        5
      );
    }

    // update Redis async
    if (redis) {
      redis.set(REDIS_KEY, fileData).catch(() => {});
    }

    memoryCache = {
      ts: Date.now(),
      data: fileData,
    };

    log("cache_miss_file", {
      latency: Date.now() - start,
      count: fileData.count,
    });

    return Response.json(fileData);
  } catch (e) {
    log("scan_error", {
      error: e.message,
      latency: Date.now() - start,
    });

    return errorResponse(
      500,
      "SCAN_INTERNAL_ERROR",
      e.message,
      10
    );
  }
}
