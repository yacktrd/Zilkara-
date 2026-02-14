export const dynamic = "force-dynamic";

async function getState() {
  try {
    const res = await fetch("https://zilkara.app/api/state", {
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const state = await getState();
  const assets = state?.assets || [];

  return (
    <main
      style={{
        background: "#000",
        color: "#fff",
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "Arial",
      }}
    >
      <h1>Zilkara — Market Scanner</h1>

      <p>
        Signal = score technique (0–100) basé sur liquidité, taille,
        turnover et momentum.
      </p>

      <div style={{ marginTop: "20px" }}>
        {assets.length === 0 && (
          <p style={{ color: "#888" }}>Aucun asset disponible.</p>
        )}

        {assets.map((asset) => (
          <div
            key={asset.symbol}
            style={{
              border: "1px solid #333",
              padding: "15px",
              marginBottom: "15px",
              borderRadius: "8px",
            }}
          >
            <h2>
              {asset.name} ({asset.symbol})
            </h2>

            <p>Price : {asset.price}</p>
            <p>Score : {asset.stability_score}</p>
            <p>Rating : {asset.rating}</p>
            <p>Regime : {asset.regime}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "20px", color: "#888" }}>
        MAJ : {state?.updated
          ? new Date(state.updated).toLocaleTimeString()
          : "—"}
        <br />
        Source : {state?.source || "—"}
      </div>
    </main>
  );
}
