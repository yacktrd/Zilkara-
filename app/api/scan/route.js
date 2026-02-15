import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const PAYLOAD_KEY = "assets_payload";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 250);

    const payload = await redis.get(PAYLOAD_KEY);

    if (!payload || !payload.assets) {
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

    const assets = payload.assets.slice(0, limit);

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

    console.error("[SCAN_ERROR]", err);

    return NextResponse.json({
      ok: false,
      ts: Date.now(),
      data: [],
      error: {
        code: "INTERNAL",
        message: err.message
      }
    }, { status: 500 });

  }
}
