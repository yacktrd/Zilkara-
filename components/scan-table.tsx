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

function pctTone(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "text-neutral-500";
  if (n > 0) return "text-emerald-600";
  if (n < 0) return "text-red-600";
  return "text-neutral-500";
}

function scoreTone(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "bg-neutral-100 text-neutral-500";
  if (n >= 85) return "bg-emerald-100 text-emerald-700";
  if (n >= 70) return "bg-blue-100 text-blue-700";
  if (n >= 55) return "bg-amber-100 text-amber-700";
  return "bg-neutral-100 text-neutral-600";
}

function regimeTone(regime: string | null | undefined): string {
  if (regime === "STABLE") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (regime === "TRANSITION") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  if (regime === "VOLATILE") return "bg-red-50 text-red-700 ring-1 ring-red-200";
  return "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200";
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
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-3 text-xs text-neutral-500">
        <span className="rounded-full bg-neutral-100 px-2.5 py-1">
          Quote: {quote.toUpperCase()}
        </span>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1">
          Sort: {sort}
        </span>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1">
          Limit: {limit}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-semibold">Asset</th>
              <th className="px-4 py-3 font-semibold">Prix</th>
              <th className="px-4 py-3 font-semibold">24h</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Régime</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {assets.map((asset) => (
              <tr
                key={`${asset.id}-${asset.symbol}`}
                className="border-b border-neutral-100 transition-colors hover:bg-neutral-50"
              >
                <td className="px-4 py-3 align-middle">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-neutral-900">
                      {asset.symbol}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {asset.name}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 align-middle font-medium text-neutral-900">
                  {formatPrice(asset.price)}
                </td>

                <td className={`px-4 py-3 align-middle font-medium ${pctTone(asset.chg_24h_pct)}`}>
                  {formatPct(asset.chg_24h_pct)}
                </td>

                <td className="px-4 py-3 align-middle">
                  <span
                    className={`inline-flex min-w-[52px] justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${scoreTone(asset.confidence_score)}`}
                  >
                    {formatScore(asset.confidence_score)}
                  </span>
                </td>

                <td className="px-4 py-3 align-middle">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${regimeTone(asset.regime)}`}
                  >
                    {asset.regime ?? "-"}
                  </span>
                </td>

                <td className="px-4 py-3 text-right align-middle">
                  <a
                    href={asset.affiliate_url || asset.binance_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-900 transition-colors hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
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
