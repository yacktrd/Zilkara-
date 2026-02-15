export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmt(n) {
  if (n === null || n === undefined) return "-";
  const x = Number(n);
  if (!Number.isFinite(x)) return String(n);
  if (Math.abs(x) >= 1000) return x.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (Math.abs(x) >= 1) return x.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return x.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

export async function GET() {
  // Binance public endpoint: 24h ticker stats
  const url = "https://api.binance.com/api/v3/ticker/24hr";
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    return Response.json({ ok: false, error: "binance_fetch_failed" }, { status: 502 });
  }

  const all = await r.json();

  // Filtre simple: USDT pairs + tri par quoteVolume
  const items = all
    .filter((x) => typeof x.symbol === "string" && x.symbol.endsWith("USDT"))
    .map((x) => ({
      symbol: x.symbol,
      price: fmt(x.lastPrice),
      change24hPct: fmt(x.priceChangePercent) + "%",
      quoteVolume24h: fmt(x.quoteVolume),
    }))
    .sort((a, b) => Number(String(b.quoteVolume24h).replace(/,/g, "")) - Number(String(a.quoteVolume24h).replace(/,/g, "")))
    .slice(0, 30);

  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    items,
  });
}
