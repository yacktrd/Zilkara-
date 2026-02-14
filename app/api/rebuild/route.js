import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import assetsFile from "@/data/assets.json";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function getRedis() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;

  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      `Missing Redis env. url=${Boolean(url)} token=${Boolean(token)}`
    );
  }

  return new Redis({ url, token });
}

export async function POST() {
  try {
    const redis = getRedis();

    const payload = {
      updated: Date.now(),
      assets: assetsFile.assets ?? [],
    };

    await redis.set("assets_payload", payload);

    return NextResponse.json({
      ok: true,
      rebuilt: true,
      count: payload.assets.length,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
