// app/api/rebuild/route.js

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import assetsFile from "@/data/assets.json";

// IMPORTANT : utiliser Node runtime (pas edge)
export const runtime = "nodejs";

// Création client Redis
function getRedis() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;

  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Missing Redis environment variables");
  }

  return new Redis({ url, token });
}

// Auth rebuild
function getAuthToken(req) {
  const bearer = req.headers.get("authorization") || "";

  if (bearer.toLowerCase().startsWith("bearer ")) {
    return bearer.slice(7).trim();
  }

  return (
    req.headers.get("x-rebuild-token") ||
    req.headers.get("x-api-key") ||
    ""
  ).trim();
}

export async function POST(req) {
  try {
    // Vérification token
    const expected = process.env.REBUILD_TOKEN;

    if (!expected) {
      return NextResponse.json(
        { ok: false, error: "REBUILD_TOKEN missing" },
        { status: 500 }
      );
    }

    const provided = getAuthToken(req);

    if (provided !== expected) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Création Redis
    const redis = getRedis();

    // Création payload
    const assets = assetsFile?.assets ?? assetsFile ?? [];

    const payload = {
      updated: Date.now(),
      assets,
    };

    // Sauvegarde KV
    await redis.set("assets_payload", payload);

    return NextResponse.json({
      ok: true,
      saved: true,
      count: assets.length,
      updated: payload.updated,
    });

  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Rebuild failed",
      },
      { status: 500 }
    );
  }
}
