export default async function Home() {
  const res = await fetch("https://zilkara.app/api/state", { cache: "no-store" });
  const data = await res.json();

  return (
    <main style={{
      background: "#000",
      color: "#fff",
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "Arial"
    }}>
      <h1>Zilkara Scanner</h1>

      {Array.isArray(data.assets) && data.assets.length > 0 ? (
        data.assets.map(a => (
          <div key={a.symbol} style={{
            border: "1px solid #333",
            padding: "10px",
            marginBottom: "10px"
          }}>
            <h2>{a.name} ({a.symbol})</h2>
            <p>Price: {a.price}</p>
            <p>Score: {a.stability_score}</p>
            <p>Rating: {a.rating}</p>
            <p>Regime: {a.regime}</p>
          </div>
        ))
      ) : (
        <p>No data yet.</p>
      )}
    </main>
  );
}
