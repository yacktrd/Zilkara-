import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import assetsFile from "@/data/assets.json";

export const runtime = "edge";

const redis = Redis.fromEnv();

export async function POST(request) {
  try {

    // construire payload
    const payload = {
      updated: Date.now(),
      assets: assetsFile.assets ?? []
    };

    // sauver dans KV
    await redis.set("assets_payload", payload);

    return NextResponse.json({
      ok: true,
      updated: payload.updated,
      count: payload.assets.length
    });

  } catch (error) {

    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });

  }
}
