import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import assetsFile from "@/data/assets.json";

export const runtime = "edge";

export async function GET() {
  // 1) tente KV
  try {
    const cached = await kv.get("assets_payload");
    if (cached && cached.assets && cached.assets.length) {
      return NextResponse.json({ ok: true, ...cached, source: "kv" });
    }
  } catch (e) {
    // on ignore et on fallback
  }

  // 2) fallback fichier
  const payload = {
    updated: assetsFile.updated ?? Date.now(),
    assets: assetsFile.assets ?? [],
    source: "file",
  };

  return NextResponse.json({ ok: true, ...payload });
}
