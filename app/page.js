export const dynamic = "force-dynamic";

async function getScan() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/scan`, {
    cache: "no-store",
  });
  return res.json();
}

export default async function Home() {
  const json = await getScan();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 8 }}>Zilkara</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>Market Structure Scanner</p>

      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {JSON.stringify(json, null, 2)}
      </pre>
    </main>
  );
}
