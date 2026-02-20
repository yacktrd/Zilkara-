"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * Standard API unique attendu (backend) :
 * { symbol, price, chg_24h_pct, stability_score, regime, binance_url }
 */
type ScanAsset = {
  symbol?: string;
  price?: number;

  chg_24h_pct?: number;
  stability_score?: number;
  regime?: string;

  binance_url?: string;

  // tolérance si le backend renvoie encore autre chose
  asset?: string; // ancien champ possible
};

type ApiError = { code?: string; message?: string };

type ScanResponse = {
  ok: boolean;
  ts?: number;
  data?: ScanAsset[];
  error?: ApiError;
};

function fmtPct(n?: number) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)}%`;
}

function fmtPrice(n?: number) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 8 }).format(n);
}

function safeStr(s?: string) {
  return s && s.trim().length ? s.trim() : "—";
}

function nowHHMMSS(d = new Date()) {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Normalisation ultra légère (frontend only) */
function normalizeSymbol(a: ScanAsset): string {
  // priorité au standard, fallback aux anciens champs
  const raw = (a.symbol ?? a.asset ?? "").toString().trim();
  return raw.length ? raw : "—";
}

export default function Page() {
  const [data, setData] = useState<ScanAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false); // ✅ auto-refresh invisible
  const [err, setErr] = useState<string | null>(null);
  const [lastTs, setLastTs] = useState<number | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    else setSyncing(true);

    // IMPORTANT : en mode silencieux on ne touche pas au message d'erreur
    if (!silent) setErr(null);

    try {
      const res = await fetch("/api/scan", { cache: "no-store" });
      const json = (await res.json()) as ScanResponse;

      if (!json.ok) throw new Error(json.error?.message || "Scan failed");

      // ✅ Ne jamais vider l’écran si l’API renvoie une liste vide par accident
      if (Array.isArray(json.data) && json.data.length > 0) {
        setData(json.data);
        setLastTs(typeof json.ts === "number" ?
