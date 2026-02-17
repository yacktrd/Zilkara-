// app/api/health/route.js

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();

  try {
    const filePath = path.join(process.cwd(), "data", "assets.json");

    let exists = false;
    let assetCount = 0;

    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const json = JSON.parse(raw);

      const data = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : [];

      exists = true;
      assetCount = data.length;

    } catch {
      exists = false;
    }

    const latency = Date.now() - start;

    return NextResponse.json(
      {
        ok: true,
        service: "zilkara",

        status: exists ? "healthy" : "degraded",

        timestamp: Date.now(),

        latency_ms: latency,

        assets_file: exists,

        asset_count: assetCount,

        cache: "memory",

        version: "1.0.0",

        endpoints: {
          scan: "/api/scan",
          health: "/api/health",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch (err) {

    return NextResponse.json(
      {
        ok: false,

        service: "zilkara",

        status: "error",

        timestamp: Date.now(),

        error: "HEALTH_CHECK_FAILED",

        message: err.message,
      },
      { status: 500 }
    );

  }
}
