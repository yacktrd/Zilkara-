// components/scan-table.tsx

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";

export type ScanAsset = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  h24: number;
  chg_24h_pct: number;
  market_cap?: number;
  volume_24h?: number;
  confidence_score: number;
  regime: Regime;
  binance_url: string;
  affiliate_url?: string;
};

type Props = {
  items: ScanAsset[];
};

function safeNumber(value: unknown, fallback = NaN): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function formatPrice(value: number): string {
  const n = safeNumber(value);

  if (!Number.isFinite(n)) return "-";

  if (Math.abs(n) >= 1000) {
    return n.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  if (Math.abs(n) >= 1) {
    return n.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }

  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

function formatPct(value: number): string {
  const n = safeNumber(value);

  if (!Number.isFinite(n)) return "-";

  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function formatCompactNumber(value?: number): string {
  const n = safeNumber(value);

  if (!Number.isFinite(n)) return "-";

  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

function getConfidenceLabel(score: number): string {
  const n = safeNumber(score, 0);

  if (n >= 85) return "High";
  if (n >= 70) return "Strong";
  if (n >= 55) return "Moderate";
  return "Low";
}

function getTradeUrl(item: ScanAsset): string {
  const affiliate = typeof item.affiliate_url === "string" ? item.affiliate_url.trim() : "";
  const fallback = typeof item.binance_url === "string" ? item.binance_url.trim() : "";

  return affiliate || fallback || "https://www.binance.com/en/markets";
}

function getRegimeClasses(regime: Regime): string {
  if (regime === "STABLE") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (regime === "TRANSITION") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-red-500/20 bg-red-500/10 text-red-300";
}

function getPctClasses(value: number): string {
  const n = safeNumber(value);

  if (!Number.isFinite(n)) return "text-neutral-400";
  if (n > 0) return "text-emerald-300";
  if (n < 0) return "text-red-300";
  return "text-neutral-200";
}

function getScoreClasses(score: number): string {
  const n = safeNumber(score, 0);

  if (n >= 85) return "text-emerald-300";
  if (n >= 70) return "text-amber-300";
  if (n >= 55) return "text-orange-300";
  return "text-neutral-200";
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5">
      <p className="text-sm font-medium text-neutral-100">Aucun résultat</p>
      <p className="mt-1 text-sm text-neutral-500">
        Le moteur n’a retourné aucun actif exploitable pour cette vue.
      </p>
    </div>
  );
}

function MobileCard({ item }: { item: ScanAsset }) {
  const tradeUrl = getTradeUrl(item);
  const pct = safeNumber(item.chg_24h_pct);
  const score = safeNumber(item.confidence_score, 0);
  const confidence = getConfidenceLabel(score);

  return (
    <a
      href={tradeUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 transition hover:border-neutral-700 hover:bg-neutral-950"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-semibold tracking-tight text-neutral-50">
              {item.symbol}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getRegimeClasses(
                item.regime
              )}`}
            >
              {item.regime}
            </span>
          </div>

          <div className="mt-1 truncate text-xs text-neutral-500">{item.name}</div>
        </div>

        <div className="text-right">
          <div className={`text-lg font-semibold leading-none ${getScoreClasses(score)}`}>
            {Number.isFinite(score) ? score : "-"}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-neutral-500">
            {confidence}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Prix</div>
          <div className="mt-1 text-sm font-medium text-neutral-100">
            {formatPrice(item.price)}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">24h</div>
          <div className={`mt-1 text-sm font-medium ${getPctClasses(pct)}`}>
            {formatPct(pct)}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Signal</div>
          <div className="mt-1 text-sm font-medium text-neutral-200">{confidence}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-neutral-800 pt-3 text-[11px] text-neutral-500">
        <span>Mcap {formatCompactNumber(item.market_cap)}</span>
        <span>Vol {formatCompactNumber(item.volume_24h)}</span>
      </div>
    </a>
  );
}

function DesktopTable({ items }: { items: ScanAsset[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950/70 md:block">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left">
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Asset
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Score
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Regime
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Price
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              24h
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Market Cap
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Volume
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Open
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const pct = safeNumber(item.chg_24h_pct);
            const score = safeNumber(item.confidence_score, 0);

            return (
              <tr
                key={`${item.id}-${item.symbol}`}
                className="border-b border-neutral-900/80 transition hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-semibold tracking-tight text-neutral-50">
                      {item.symbol}
                    </span>
                    <span className="truncate text-xs text-neutral-500">{item.name}</span>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className={`font-semibold ${getScoreClasses(score)}`}>
                      {Number.isFinite(score) ? score : "-"}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {getConfidenceLabel(score)}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getRegimeClasses(
                      item.regime
                    )}`}
                  >
                    {item.regime}
                  </span>
                </td>

                <td className="px-4 py-3 font-medium text-neutral-100">
                  {formatPrice(item.price)}
                </td>

                <td className={`px-4 py-3 font-medium ${getPctClasses(pct)}`}>
                  {formatPct(pct)}
                </td>

                <td className="px-4 py-3 text-neutral-400">
                  {formatCompactNumber(item.market_cap)}
                </td>

                <td className="px-4 py-3 text-neutral-400">
                  {formatCompactNumber(item.volume_24h)}
                </td>

                <td className="px-4 py-3">
                  <a
                    href={getTradeUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-neutral-300 transition hover:text-neutral-50"
                    aria-label={`Open ${item.symbol}`}
                  >
                    Open
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ScanTable({ items }: Props) {
  const normalizedItems = safeArray(items);

  if (normalizedItems.length === 0) {
    return <EmptyState />;
  }

  return (
    <section aria-label="Assets">
      <div className="grid gap-3 md:hidden">
        {normalizedItems.map((item) => (
          <MobileCard key={`${item.id}-${item.symbol}`} item={item} />
        ))}
      </div>

      <DesktopTable items={normalizedItems} />
    </section>
  );
}

export default ScanTable;
