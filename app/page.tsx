"use client";

import { useEffect, useState } from "react";

export default function Home() {

  const [state, setState] = useState<any>(null);

  useEffect(() => {
    fetch("/api/state")
      .then(res => res.json())
      .then(setState);
  }, []);

  return (
    <main style={{
      background:"#0a0a0a",
      color:"#fff",
      minHeight:"100vh",
      padding:"40px",
      fontFamily:"system-ui"
    }}>
      <h1>Zilkara</h1>

      <p>Market Scanner Core Engine</p>

      {state && (
        <div style={{marginTop:"20px"}}>
          <div>Status: OK</div>
          <div>Timestamp: {state.ts}</div>
        </div>
      )}

    </main>
  );
}
