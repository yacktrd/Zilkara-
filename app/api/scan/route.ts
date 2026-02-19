import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs"; // nécessaire si tu lis un fichier local (fs)
export const dynamic = "force-dynamic"; // pas de cache côté build/CDN

type Asset = {
  asset: string;
  price: number;
  chg_24h_pct: number;
  chg_7d_pct: number;
  stability_score: number;
  rating: string;
  regime: string;
};

function asNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function normalizeRow(row: any): Asset {
  return {
    asset: asString(row?.asset),
    price: asNumber(row?.price),
    chg_24h_pct: asNumber(row?.chg_24h_pct),
    chg_7d_pct: asNumber(row?.chg_7d_pct),
    stability_score: asNumber(row?.stability_score),
    rating: asString(row?.rating),
    regime: asString(row?.regime),
  };
}

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "assets.json");

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    const rows = Array.isArray(parsed?.data)
      ? parsed.data
      : Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.assets)
          ? parsed.assets
          : [];

    const data: Asset[] = rows.map(normalizeRow);

    return NextResponse.json(
      {
        ok: true,
        data,
        meta: {
          source: "file",
          file: "data/assets.json",
          count: data.length,
          ts: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to read/parse data/assets.json",
        details: asString(err?.message),
        meta: {
          file: "data/assets.json",
          ts: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
