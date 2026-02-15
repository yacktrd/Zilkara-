
export const dynamic = "force-dynamic";

async function getScan() {
  try {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";

    const url = base.startsWith("http")
      ? `${base}/api/scan`
      : `https://${base}/api/scan`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, error: "scan fetch failed" };
    }

    return res.json();

  } catch (e) {
    return {
      ok: false,
      error: e.message,
    };
  }
}

export default async function Home() {
  const json = await getScan();

  return (
    <main style={{ padding: 24 }}>
      <h1>Zilkara</h1>

      <pre>
        {JSON.stringify(json, null, 2)}
      </pre>
    </main>
  );
}
