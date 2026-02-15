import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "assets.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const db = JSON.parse(raw);

    const assets = Array.isArray(db?.assets) ? db.assets : [];
    const updatedAt = db?.updatedAt ?? null;

    return NextResponse.json(
      {
        ok: true,
        route: "scan",
        updatedAt,
        count: assets.length,
        assets,
        ts: Date.now(),
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        route: "scan",
        error: error?.message ?? String(error),
        ts: Date.now(),
      },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
