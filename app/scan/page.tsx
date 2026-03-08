// app/scan/page.tsx
import { getXyvalaScan, type ScanAsset } from "@/lib/xyvala/scan";
import { ScanTable } from "@/components/scan-table";

type ScanTableItem = ScanAsset & {
  affiliate_url: string;
};

function normalizeItems(items: ScanAsset[]): ScanTableItem[] {
  return items.map((item) => ({
    ...item,
    affiliate_url: item.affiliate_url ?? item.binance_url,
  }));
}

export default async function ScanPage() {
  const result = await getXyvalaScan({
    quote: "usd",
    sort: "score_desc",
    limit: 100,
  });

  const items = normalizeItems(result.data ?? []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Xyvala Scan</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Structured crypto scan ranked by confidence score.
        </p>
      </div>

      <ScanTable items={items} />
    </main>
  );
}
