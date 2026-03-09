// app/scan/page.tsx
import { getXyvalaScan, type ScanAsset } from "@/lib/xyvala/scan";
import { ScanTable } from "@/components/scan-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ScanTableItem = ScanAsset & {
  affiliate_url: string;
};

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeItems(items: ScanAsset[]): ScanTableItem[] {
  return safeArray(items).map((item) => ({
    ...item,
    affiliate_url: item.affiliate_url ?? item.binance_url,
  }));
}

function uniqueWarnings(warnings?: string[]): string[] {
  if (!Array.isArray(warnings)) return [];
  return [...new Set(warnings.filter(Boolean))];
}

function buildSummary(result: Awaited<ReturnType<typeof getXyvalaScan>>) {
  const count = Array.isArray(result.data) ? result.data.length : 0;
  const warnings = uniqueWarnings(result.meta?.warnings);

  return {
    source: result.source ?? "fallback",
    quote: result.quote ?? "usd",
    count,
    warnings,
    hasWarnings: warnings.length > 0,
    isFallback: result.source === "fallback",
    hasError: Boolean(result.error),
  };
}

export default async function ScanPage() {
  let result: Awaited<ReturnType<typeof getXyvalaScan>> | null = null;
  let fatalError: string | null = null;

  try {
    result = await getXyvalaScan({
      market: "crypto",
      quote: "usd",
      sort: "score_desc",
      limit: 100,
    });
  } catch (error) {
    fatalError =
      error instanceof Error && error.message
        ? error.message
        : "unknown_scan_page_error";
  }

  if (fatalError || !result) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Xyvala Scan</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Structured crypto scan ranked by confidence score.
          </p>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm font-medium text-red-300">Erreur de chargement</p>
          <p className="mt-1 text-sm text-red-200/80">
            {fatalError ?? "scan_page_unavailable"}
          </p>
        </div>
      </main>
    );
  }

  const items = normalizeItems(result.data);
  const summary = buildSummary(result);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Xyvala Scan</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Structured crypto scan ranked by confidence score.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          <span className="rounded-full border border-neutral-800 px-3 py-1">
            Source: {summary.source}
          </span>
          <span className="rounded-full border border-neutral-800 px-3 py-1">
            Quote: {summary.quote.toUpperCase()}
          </span>
          <span className="rounded-full border border-neutral-800 px-3 py-1">
            Assets: {summary.count}
          </span>
        </div>
      </div>

      {summary.hasError && (
        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-300">
            Source partiellement dégradée
          </p>
          <p className="mt-1 text-sm text-amber-200/80">{result.error}</p>
        </div>
      )}

      {summary.isFallback && (
        <div className="mb-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-sm font-medium text-blue-300">Mode fallback actif</p>
          <p className="mt-1 text-sm text-blue-200/80">
            Les données affichées proviennent du filet de sécurité interne.
          </p>
        </div>
      )}

      {summary.hasWarnings && (
        <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="text-sm font-medium text-neutral-200">Warnings</p>
          <ul className="mt-2 space-y-1 text-sm text-neutral-400">
            {summary.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {items.length > 0 ? (
        <ScanTable items={items} />
      ) : (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <p className="text-sm font-medium text-neutral-200">Aucun résultat</p>
          <p className="mt-1 text-sm text-neutral-500">
            Le scan a répondu, mais aucun actif exploitable n’a été retourné.
          </p>
        </div>
      )}
    </main>
  );
}
