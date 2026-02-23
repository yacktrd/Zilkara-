// app/scan/page.tsx
import ScanTable from "./scan-table";

export const revalidate = 0;

async function getScan() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scan`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load scan");
  return res.json();
}

export default async function ScanPage() {
  const data = await getScan();

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 12px 0" }}>Scan — Confidence</h1>
      <p style={{ margin: "0 0 16px 0", opacity: 0.7 }}>
        Sorted by confidence score (desc). Last 24h context.
      </p>

      <ScanTable items={data.items ?? []} />
    </main>
  );
}
