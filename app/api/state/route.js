import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import assetsFile from "@/data/assets.json";

export const runtime = "edge";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function GET() {
  try {
    const cached = await redis.get("assets_payload");

    if (cached && cached.assets?.length) {
      return NextResponse.json({
        ok: true,
        ...cached,
        source: "kv",
      });
    }
  } catch (e) {
    console.error("KV error:", e);
  }

  const payload = {
    updated: assetsFile.updated ?? Date.now(),
    assets: assetsFile.assets ?? [],
    source: "file",
  };

  return NextResponse.json({
    ok: true,
    ...payload,
  });
}
