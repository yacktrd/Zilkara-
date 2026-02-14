
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

export async function GET() {
  // 1) tente Redis
  try {
    const redis = getRedis();
    const cached = await redis.get("assets_payload");

    if (cached && cached.assets?.length) {
      return NextResponse.json({ ok: true, ...cached, source: "kv" });
    }
  } catch (e) {
    // on ignore et fallback
  }

  // 2) fallback fichier
  const payload = {
    updated: assetsFile.updated ?? Date.now(),
    assets: assetsFile.assets ?? [],
    source: "file",
  };

  return NextResponse.json({ ok: true, ...payload });
}
