"use client";

/*
 * FILE: components/TopBar.tsx
 *
 * ROLE
 * - render public scan controls
 * - expose query, timeframe and public sorting controls
 *
 * DIRECTIVES
 * - UI only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no private decision / regime / opportunity exposure
 * - no API logic
 * - no business logic
 * - deterministic controlled component
 */

import React from "react";

import type { SortMode } from "@/lib/sort";

type Timeframe = "24H" | "7D" | "30D";

type TopBarProps = {
  query: string;
  onQuery: (value: string) => void;

  sort: SortMode;
  onSort: (value: SortMode) => void;

  tf: Timeframe;
  onTf: (value: Timeframe) => void;
};

export function TopBar(props: TopBarProps) {
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
        <div
          style={title}
          onClick={() => window.location.reload()}
          title="Home / Refresh"
        >
          Xyvala
        </div>

        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Rechercher un actif"
          style={input}
          inputMode="search"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <select
          value={tf}
          onChange={(event) => onTf(event.target.value as Timeframe)}
          style={select}
          aria-label="Timeframe"
        >
          <option value="24H">24H</option>
          <option value="7D">7D</option>
          <option value="30D">30D</option>
        </select>

        <select
          value={sort}
          onChange={(event) => onSort(event.target.value as SortMode)}
          style={select}
          aria-label="Tri"
        >
          <option value="rank_desc">Classement ↓</option>
          <option value="rank_asc">Classement ↑</option>
          <option value="price_desc">Prix ↓</option>
          <option value="price_asc">Prix ↑</option>
          <option value="stability_desc">Stabilité ↓</option>
          <option value="stability_asc">Stabilité ↑</option>
        </select>
      </div>
    </div>
  );
}
