// components/TopBar.tsx
"use client";

import React from "react";
import type { SortMode, Timeframe } from "@/lib/types";

export function TopBar(props: {
  query: string;
  onQuery: (v: string) => void;

  sort: SortMode;
  onSort: (v: SortMode) => void;

  tf: Timeframe;
  onTf: (v: Timeframe) => void;
}) {
  const { query, onQuery, sort, onSort, tf, onTf } = props;

  const box: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 10,
    padding: 12,
    backdropFilter: "blur(10px)",
    background: "rgba(10,10,12,0.72)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  };

  const row: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  };

  const title: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: -0.2,
    cursor: "pointer",
    userSelect: "none",
  };

  const input: React.CSSProperties = {
    flex: 1,
    minWidth: 180,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    outline: "none",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    fontWeight: 700,
  };

  const select: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    fontWeight: 800,
  };

  return (
    <div style={box}>
      <div style={row}>
        <div style={title} onClick={() => window.location.reload()} title="Home / Refresh">
          Zilkara
        </div>

        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Rechercher un actif (symbole ou nom)"
          style={input}
          inputMode="search"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <select value={tf} onChange={(e) => onTf(e.target.value as Timeframe)} style={select} aria-label="Timeframe">
          <option value="24H">24H</option>
          <option value="7D">7D</option>
          <option value="30D">30D</option>
        </select>

        {/* Tri compact : Prix | Classement (score interne) */}
        <select value={sort} onChange={(e) => onSort(e.target.value as SortMode)} style={select} aria-label="Tri">
          <option value="rank_desc">Classement ↓</option>
          <option value="rank_asc">Classement ↑</option>
          <option value="price_desc">Prix ↓</option>
          <option value="price_asc">Prix ↑</option>
        </select>
      </div>
    </div>
  );
}
