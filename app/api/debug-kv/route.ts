import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    console.log("KV URL:", url);
    console.log("KV TOKEN PREFIX:", token?.slice(0, 12));
    console.log("KV TOKEN LENGTH:", token?.length);

    if (!url || !token) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_env",
          hasUrl: !!url,
          hasToken: !!token,
        },
        { status: 500 }
      );
    }

    const redis = new Redis({ url, token });

    const key = "xyvala:test";
    const payload = {
      ok: true,
      ts: Date.now(),
    };

    await redis.set(key, payload);
    const readBack = await redis.get(key);

    return NextResponse.json({
      ok: true,
      key,
      written: payload,
      readBack,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
