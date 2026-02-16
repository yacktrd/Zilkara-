// app/api/scan/route.js
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// IMPORTANT: laisse Node par défaut
export const runtime = "nodejs";

const redis = Redis.fromEnv();
const PAYLOAD_KEY = "assets_payload";

function json(ok, payload = {}, status = 200) {
  return NextResponse.json({ ok, ts: Date.now(), ...payload }, { status });
}

function parseLimit(raw, fallback = 250, max = 250) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    // hard cap 250 côté API (cohérent avec ton rebuild)
    const limit = parseLimit(searchParams.get("limit"), 250, 250);

    const payload = await redis.get(PAYLOAD_KEY);

if (!payload) {
  return NextResponse.json({
    ok: false,
    ts: Date.now(),
    data: [],
    error: {
      code: "NO_DATA",
      message: "No assets_payload in Redis"
    }
  });
}

const allAssets = payload.assets || payload.data || [];
const assets = allAssets.slice(0, limit);

return NextResponse.json({
  ok: true,
  ts: Date.now(),
  data: assets,
  meta: {
    updatedAt: payload.payload_updatedAt,
    count: assets.length,
    limit
  }
});



    
  } catch (err) {
    console.error("[/api/scan] INTERNAL", err);
    return json(
      false,
      {
        data: [],
        error: { code: "INTERNAL", message: err?.message || "Internal error" },
        meta: { updatedAt: null, count: 0, limit: 0 },
      },
      500
    );
  }
}
