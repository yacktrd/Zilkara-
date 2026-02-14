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
      background:"#0b0f17",
      color:"#ffffff",
      minHeight:"100vh",
      padding:"40px",
      fontFamily:"system-ui"
    }}>
      <h1>Zilkara</h1>

      <p>Core engine online</p>

      {state && (
        <div style={{marginTop:"20px"}}>
          <div>Status: {state.ok ? "ONLINE" : "OFFLINE"}</div>
          <div>Timestamp: {state.ts}</div>
        </div>
      )}

    </main>
  );
}
