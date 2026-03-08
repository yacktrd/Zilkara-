// app/page.tsx
"use client";

/**
 * Xyvala — Home (Client)
 * Objectif : robustesse Safari + dev/prod (Vercel) + pas de faux "Erreur" sur AbortController.
 *
 * Points clés :
 * - Fetch en URL RELATIVE (/api/scan, /api/context) => évite NEXT_PUBLIC_APP_URL côté client
 * - AbortController : AbortError ignoré (normal en React/dev + Safari)
 * - Timeout soft (sécurité) + gestion d’erreurs propre
 * - Branding : Xyvala (UI + meta title)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SortMode = "score_desc" | "score_asc" | "price_desc" | "price_asc";

type RfsContext = {
  label?: string; // ex: "Confiance"
  regime?: string; // ex: "STABLE" | "TRANSITION" | "VOLATILE"
  ok?: boolean;
};

export type ScanAsset = {
  symbol: string;
  name?: string;

  // metrics
  price?: number | null;
  h24?: number | null; // variation 24h en %
  confidence_score?: number | null;

  // tags/flags
  regime_label?: string | null; // ex: STABLE/TRANSITION/VOLATILE
  stability_ratio?: number | null;

  // optional: tout ce que ton backend renvoie peut rester ici
  [k: string]: any;
};

type ScanResponse = {
  ok: boolean;
  market?: string;
  quote?: string;
  count?: number;
  data?: ScanAsset[];
  error?: string;
  ts?: string;
};

type ContextResponse = {
  ok: boolean;
  market?: string;
  quote?: string;
  data?: RfsContext;
  error?: string;
  ts?: string;
};

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as any).name === "AbortError")
  );
}

async function fetchJSON<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 15000;

  // Timeout “soft” via AbortController dédié
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    // 204/empty -> retourne un objet vide typé si besoin
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const msg =
        (json && (json.error || json.message)) ||
        `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    return json as T;
  } finally {
    clearTimeout(timeout);
  }
}

function fmtPct(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function fmtPrice(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  // format simple, stable
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: v >= 100 ? 0 : v >= 1 ? 2 : 6,
  }).format(v);
}

function sortAssets(list: ScanAsset[], mode: SortMode) {
  const arr = [...list];
  arr.sort((a, b) => {
    const as = a.confidence_score ?? -1;
    const bs = b.confidence_score ?? -1;
    const ap = a.price ?? -1;
    const bp = b.price ?? -1;

    switch (mode) {
      case "score_asc":
        return as - bs;
      case "score_desc":
        return bs - as;
      case "price_asc":
        return ap - bp;
      case "price_desc":
        return bp - ap;
      default:
        return bs - as;
    }
  });
  return arr;
}

export default function Home() {
  // Branding (simple + fiable)
  useEffect(() => {
    document.title = "Xyvala";
  }, []);

  // UI state
  const [market] = useState<string>("crypto");
  const [quote] = useState<string>("usdt");

  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("score_desc");
  const [filter, setFilter] = useState<"ALL" | "STABLE" | "TRANSITION" | "VOLATILE">("ALL");
  const [mode, setMode] = useState<"exclude" | "include">("exclude");

  // Data state
  const [ctx, setCtx] = useState<RfsContext>({ label: "Confiance", ok: true });
  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Abort handling
  const abortRef = useRef<AbortController | null>(null);

  const buildScanUrl = useCallback(() => {
    const p = new URLSearchParams();
    p.set("market", market);
    p.set("quote", quote);
    p.set("limit", "250");
    p.set("sort", sortMode);

    // si tu as ces filtres côté API, sinon ça ne gêne pas
    if (filter !== "ALL") p.set("regime", filter);
    if (query.trim()) p.set("q", query.trim());
    if (mode) p.set("mode", mode);

    return `/api/scan?${p.toString()}`;
  }, [market, quote, sortMode, filter, query, mode]);

  const buildContextUrl = useCallback(() => {
    const p = new URLSearchParams();
    p.set("market", market);
    p.set("quote", quote);
    return `/api/context?${p.toString()}`;
  }, [market, quote]);

  const load = useCallback(async () => {
    // Annule la requête précédente (normal et attendu)
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const [ctxRes, scanRes] = await Promise.all([
        fetchJSON<ContextResponse>(buildContextUrl(), { signal: controller.signal, timeoutMs: 12000 }),
        fetchJSON<ScanResponse>(buildScanUrl(), { signal: controller.signal, timeoutMs: 20000 }),
      ]);

      if (!ctxRes?.ok) throw new Error(ctxRes?.error || "Context not ok");
      if (!scanRes?.ok) throw new Error(scanRes?.error || "Scan not ok");

      setCtx(ctxRes.data ?? { label: "Confiance", ok: true });
      setAssets(scanRes.data ?? []);
    } catch (err) {
      // IMPORTANT : AbortError = on ignore (sinon Safari affiche une fausse erreur)
      if (isAbortError(err)) return;

      const msg =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Erreur inconnue";
      setError(msg);
    } finally {
      // évite de bloquer l’UI
      setLoading(false);
    }
  }, [buildContextUrl, buildScanUrl]);

  // auto-load
  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const filtered = useMemo(() => {
    let list = assets;

    // Filtre côté UI (si API ne filtre pas)
    if (filter !== "ALL") {
      list = list.filter((a) => (a.regime_label ?? "").toUpperCase() === filter);
    }

    // Query côté UI (si API ne filtre pas)
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        const s = (a.symbol ?? "").toLowerCase();
        const n = (a.name ?? "").toLowerCase();
        return s.includes(q) || n.includes(q);
      });
    }

    // Tri final côté UI (fiable)
    return sortAssets(list, sortMode);
  }, [assets, filter, query, sortMode]);

  return (
    <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 40, letterSpacing: -0.5 }}>Xyvala</h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            style={{ padding: "8px 10px", borderRadius: 10 }}
          >
            <option value="score_desc">Score ↓</option>
            <option value="score_asc">Score ↑</option>
            <option value="price_desc">Prix ↓</option>
            <option value="price_asc">Prix ↑</option>
          </select>

          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "…" : "Rafraîchir"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher…"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
          }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          {(["ALL", "STABLE", "TRANSITION", "VOLATILE"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                padding: "8px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: filter === k ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
                cursor: "pointer",
              }}
            >
              {k === "ALL" ? "Tous" : k[0] + k.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.7 }}>Mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            style={{ padding: "8px 10px", borderRadius: 10 }}
          >
            <option value="exclude">exclude</option>
            <option value="include">include</option>
          </select>
        </div>
      </div>

      {/* Context */}
      <section
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ opacity: 0.7, fontSize: 12, letterSpacing: 1 }}>RFS CONTEXT</div>
        <div style={{ fontSize: 22, marginTop: 4 }}>{ctx?.label ?? "Confiance"}</div>
        {ctx?.regime ? (
          <div style={{ marginTop: 6, opacity: 0.75 }}>Régime : {String(ctx.regime)}</div>
        ) : null}
      </section>

      {/* Error */}
      {error ? (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,0,0,0.25)",
            background: "rgba(255,0,0,0.10)",
          }}
        >
          <strong>Erreur</strong>
          <div style={{ marginTop: 4, opacity: 0.9 }}>{error}</div>
        </div>
      ) : null}

      {/* List */}
      <section style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {filtered.map((a) => (
          <div
            key={a.symbol}
            style={{
              padding: 14,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              display: "grid",
              gridTemplateColumns: "1fr 160px 120px 120px",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{a.symbol}</div>
              <div style={{ opacity: 0.65, fontSize: 12 }}>{a.name ?? ""}</div>
            </div>

            <div style={{ textAlign: "right", fontSize: 18 }}>
              {fmtPrice(a.price)}{" "}
              <span style={{ opacity: 0.6, fontSize: 12 }}>{quote.toUpperCase()}</span>
            </div>

            <div style={{ textAlign: "right", fontWeight: 600 }}>
              <span style={{ color: (a.h24 ?? 0) >= 0 ? "#66ff99" : "#ff6666" }}>
                H24 {fmtPct(a.h24)}
              </span>
            </div>

            <div style={{ textAlign: "right", opacity: 0.85 }}>
              Score{" "}
              <strong style={{ opacity: 0.95 }}>
                {a.confidence_score ?? "—"}
              </strong>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 ? (
          <div style={{ opacity: 0.7, padding: 14 }}>Aucun résultat.</div>
        ) : null}
      </section>
    </main>
  );
}
