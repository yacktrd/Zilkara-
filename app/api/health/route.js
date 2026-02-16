// app/api/health/route.js

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

/*
HEALTH ENDPOINT (PROD)

Objectif :
- savoir si l'app est "vivante"
- savoir si Redis répond
- savoir si /data/assets.json est lisible
- exposer last_update_ts + count
- logs structurés (latency, redis_ok, file_ok)
- format d’erreur standard (code/message/hint/retry_after)
*/

const REDIS_KEY = "scan:latest";

const redis =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function log(event) {
  console.log(
    JSON.stringify({
      service: "api_health",
      ...event,
      ts: Date.now(),
    })
  );
}

function errorResponse(
  code,
  message,
  hint = null,
  retry_after = null,
  status = 503
) {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, hint, retry_after, ts: Date.now() },
    },
    { status }
  );
}

export async function GET() {
  const start = Date.now();

  // -------------------------
  // 0) Base info
  // -------------------------
  const base = {
    ok: true,
    ts: Date.now(),
    service: "zilkara",
    env: process.env.VERCEL_ENV || "local",
    region: process.env.VERCEL_REGION || null,
    uptime_hint: "serverless",
  };

  // -------------------------
  // 1) Redis check
  // -------------------------
  let redis_ok = false;
  let redis_error = null;
  let redis_meta = {
    has_env: Boolean(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ),
    key: REDIS_KEY,
    last_update_ts: null,
    count: null,
  };

  if (!redis) {
    redis_error = "redis_not_configured";
  } else {
    try {
      // ping léger via read
      const v = await redis.get(REDIS_KEY);
      redis_ok = true;

      if (v && typeof v === "object") {
        redis_meta.last_update_ts =
          typeof v.updatedAt === "number" ? v.updatedAt : null;
        redis_meta.count = typeof v.count === "number" ? v.count : null;
      }
    } catch (e) {
      redis_error = e.message;
    }
  }

  // -------------------------
  // 2) File check (assets.json)
  // -------------------------
  let file_ok = false;
  let file_error = null;
  let file_meta = {
    path: "data/assets.json",
    last_update_ts: null,
    count: null,
    size_bytes: null,
  };

  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    const filePath = path.join(process.cwd(), "data", "assets.json");
    const stat = await fs.stat(filePath);
    file_meta.size_bytes = stat.size;

    const raw = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(raw);

    if (!json || !Array.isArray(json.assets)) {
      throw new Error("assets.json_invalid_schema");
    }

    file_ok = true;
    file_meta.last_update_ts =
      typeof json.updatedAt === "number" ? json.updatedAt : null;
    file_meta.count = typeof json.count === "number" ? json.count : json.assets.length;
  } catch (e) {
    file_error = e.message;
  }

  // -------------------------
  // 3) Global status
  // -------------------------
  const latency_ms = Date.now() - start;

  // Health = OK si au moins UNE source est OK (redis ou fichier)
  // (ça évite de casser prod si Redis est down mais fichier ok)
  const overall_ok = Boolean(redis_ok || file_ok);

  const payload = {
    ...base,
    ok: overall_ok,
    latency_ms,
    sources: {
      redis: {
        ok: redis_ok,
        error: redis_error,
        ...redis_meta,
      },
      file: {
        ok: file_ok,
        error: file_error,
        ...file_meta,
      },
    },
    // infos utiles au logiciel de trading
    trading: {
      data_ready: overall_ok,
      last_update_ts:
        redis_meta.last_update_ts || file_meta.last_update_ts || null,
      count: redis_meta.count || file_meta.count || null,
    },
  };

  log({
    latency_ms,
    redis_ok,
    file_ok,
    last_update_ts: payload.trading.last_update_ts,
    count: payload.trading.count,
  });

  if (!overall_ok) {
    return errorResponse(
      "HEALTH_DOWN",
      "No data source available",
      "Check Redis env vars and data/assets.json generation",
      30,
      503
    );
  }

  return NextResponse.json(payload);
}
