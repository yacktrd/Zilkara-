// app/api/scan/route.js
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
import fs from "fs/promises";
import path from "path";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeString(v) {
  return typeof v === "string" ? v : "";
}

export async function GET() {
  let file_error = null;
  let file_meta = {
    path: "data/assets.json",
    last_update_ts: null,
    count: null,
    size_bytes: null,
  };

  try {
    const filePath = path.join(process.cwd(), "data", "assets.json");

    const stat = await fs.stat(filePath);
    file_meta.size_bytes = stat.size;
    file_meta.last_update_ts = stat.mtimeMs ? Math.round(stat.mtimeMs) : null;

    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);

    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
    const data = arr
      .map((x) => {
        const score = num(x?.score) ?? num(x?.stability_score) ?? null;

        return {
          asset: safeString(x?.asset) || safeString(x?.symbol) || "",
          symbol: safeString(x?.symbol) || safeString(x?.asset) || "",
          price: num(x?.price),
          chg_24h_pct: num(x?.chg_24h_pct),
          chg_7d_pct: num(x?.chg_7d_pct),
          chg_30d_pct: num(x?.chg_30d_pct),

          score, // <= Version 1: le "Score" est servi explicitement
          stability_score: num(x?.stability_score) ?? score, // compat

          rating: safeString(x?.rating) || null,
          regime: safeString(x?.regime) || null,

          rupture_rate: num(x?.rupture_rate),
          similarity: num(x?.similarity),
          reason: safeString(x?.reason) || null,

          binance_url: safeString(x?.binance_url) || null,
        };
      })
      .filter((x) => x.asset && x.symbol);

    file_meta.count = data.length;

    return Response.json(
      {
        ok: true,
        ts: Date.now(),
        meta: file_meta,
        file_error,
        data,
      },
      { status: 200 }
    );
  } catch (e) {
    file_error = e?.message || String(e);
    return Response.json(
      {
        ok: false,
        ts: Date.now(),
        meta: file_meta,
        error: file_error,
      },
      { status: 500 }
    );
  }
}
