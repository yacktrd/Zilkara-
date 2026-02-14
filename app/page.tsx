export default function Home() {
  return (
    <main style={{
      padding: "40px",
      fontFamily: "system-ui",
      background: "#0a0a0a",
      color: "#fff",
      minHeight: "100vh"
    }}>
      <h1>Zilkara</h1>
      <p>Market Scanner Core Engine active.</p>

      <div style={{marginTop: "20px"}}>
        <a href="/api/state" style={{color:"#4ade80"}}>
          Check API Status
        </a>
      </div>
    </main>
  );
}
