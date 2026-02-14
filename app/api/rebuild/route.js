import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import assetsFile from "@/data/assets.json";

export const runtime = "edge";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function POST() {
  try {
    const payload = {
      updated: Date.now(),
      assets: assetsFile.assets ?? [],
    };

    await redis.set("assets_payload", payload);

    return NextResponse.json({
      ok: true,
      updated: payload.updated,
      count: payload.assets.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error?.message || error) },
      { status: 500 }
    );
  }
}

