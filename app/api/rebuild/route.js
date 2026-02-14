import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import assetsFile from "@/data/assets.json";

export const runtime = "edge";

export async function POST() {
  try {
    if (!assetsFile || !assetsFile.assets) {
      return NextResponse.json({
        ok: false,
        error: "No assets file"
      }, { status: 500 });
    }

    const payload = {
      updated: assetsFile.updated ?? Date.now(),
      assets: assetsFile.assets
    };

    await kv.set("assets_payload", payload);

    return NextResponse.json({
      ok: true,
      rebuilt: true,
      count: payload.assets.length
    });

  } catch (e) {

    return NextResponse.json({
      ok: false,
      error: e.message
    }, { status: 500 });

  }
}
