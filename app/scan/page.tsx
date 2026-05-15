import ScanTable from "@/components/scan-table";
import { getScanService } from "@/lib/xyvala/services/scan-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_QUOTE = "eur";
const DEFAULT_SORT = "rank";
const DEFAULT_ORDER = "asc";
const DEFAULT_LIMIT = 250;

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export default async function ScanPage() {
  const result = await getScanService({
    quote: DEFAULT_QUOTE,
    sort: DEFAULT_SORT,
    order: DEFAULT_ORDER,
    limit: DEFAULT_LIMIT,
  });

  const assets = safeArray(result?.data);

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8">
      <section>
        <ScanTable
          assets={assets}
          quote={DEFAULT_QUOTE}
          limit={DEFAULT_LIMIT}
        />
      </section>
    </main>
  );
}
