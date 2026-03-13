// components/scan-table.tsx

import type { ScanAsset } from "@/lib/xyvala/scan";

type ScanTableProps = {
  assets: ScanAsset[];
  quote: string;
  sort: string;
  limit: number;
};

function formatPrice(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  if (n >= 1000) {
    return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  }
  if (n >= 1) {
    return n.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
  }
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 8 });
}

function formatPct(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function formatScore(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  return String(Math.round(n));
}

export function ScanTable({
  assets,
  quote,
  sort,
  limit,
}: ScanTableProps) {
  if (!assets.length) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm text-neutral-600">Aucun résultat.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-3 text-xs text-neutral-500">
        <span>Quote: {quote}</span>
        <span>•</span>
        <span>Sort: {sort}</span>
        <span>•</span>
        <span>Limit: {limit}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">24h</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Régime</th>
              <th className="px-4 py-3 font-medium">Lien</th>
            </tr>
          </thead>

          <tbody>
            {assets.map((asset) => (
              <tr
                key={`${asset.id}-${asset.symbol}`}
                className="border-b border-neutral-100 last:border-b-0"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-neutral-900">
                    {asset.symbol}
                  </div>
                  <div className="text-neutral-500">{asset.name}</div>
                </td>

                <td className="px-4 py-3 text-neutral-900">
                  {formatPrice(asset.price)}
                </td>

                <td className="px-4 py-3 text-neutral-900">
                  {formatPct(
                    "chg_24h_pct" in asset ? asset.chg_24h_pct : null
                  )}
                </td>

                <td className="px-4 py-3 text-neutral-900">
                  {formatScore(asset.confidence_score)}
                </td>

                <td className="px-4 py-3 text-neutral-900">
                  {asset.regime ?? "-"}
                </td>

                <td className="px-4 py-3">
                  <a
                    href={asset.affiliate_url || asset.binance_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-neutral-900 underline underline-offset-2"
                  >
                    Trade
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
