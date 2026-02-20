import fs from "fs/promises";
import path from "path";

type PrevItem = { symbol: string; stability_score?: number; regime?: string };
type PrevSnap = { ts: number; bySymbol: Record<string, PrevItem> };

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function normRegime(r?: string) {
  const x = String(r || "").toUpperCase();
  if (x === "TRANSITION") return "TRANSITION";
  if (x === "VOLATILE") return "VOLATILE";
  return "STABLE";
}

function penaltyRegime(regime: "STABLE" | "TRANSITION" | "VOLATILE") {
  if (regime === "TRANSITION") return 10;
  if (regime === "VOLATILE") return 25;
  return 0;
}

function labelFor(score: number) {
  if (score >= 80) return "GOOD";
  if (score >= 60) return "MID";
  return "BAD";
}

function reasonFor(regime: "STABLE" | "TRANSITION" | "VOLATILE", extras?: string[]) {
  const base =
    regime === "STABLE"
      ? "Contexte stable."
      : regime === "TRANSITION"
      ? "Transition détectée."
      : "Contexte instable.";
  if (!extras || extras.length === 0) return base;
  return `${base} ${extras.join(" ")}`.trim();
}

async function readPrev(): Promise<PrevSnap | null> {
  try {
    const file = path.join(process.cwd(), ".cache", "scan_prev.json");
    const raw = await fs.readFile(file, "utf-8");
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object" || !j.bySymbol) return null;
    return j as PrevSnap;
  } catch {
    return null;
  }
}

async function writePrev(ts: number, data: any[]) {
  try {
    const dir = path.join(process.cwd(), ".cache");
    await fs.mkdir(dir, { recursive: true });

    const bySymbol: Record<string, PrevItem> = {};
    for (const a of data) {
      const sym = String(a.symbol || "").toUpperCase();
      if (!sym) continue;
      bySymbol[sym] = {
        symbol: sym,
        stability_score: typeof a.stability_score === "number" ? a.stability_score : undefined,
        regime: typeof a.regime === "string" ? a.regime : undefined,
      };
    }

    const file = path.join(dir, "scan_prev.json");
    const tmp = path.join(dir, "scan_prev.tmp.json");
    await fs.writeFile(tmp, JSON.stringify({ ts, bySymbol }), "utf-8");
    await fs.rename(tmp, file); // atomic
  } catch {
    // jamais bloquant
  }
}

export async function applyConfidence(data: any[], ts: number) {
  const prev = await readPrev();

  const enriched = data.map((a) => {
    const sym = String(a.symbol || "").toUpperCase();
    const regime = normRegime(a.regime);
    const base = typeof a.stability_score === "number" ? a.stability_score : 0;

    // V1
    let conf = clamp(base - penaltyRegime(regime));
    const extras: string[] = [];

    // V1.1 (si prev dispo)
    if (prev && sym && prev.bySymbol?.[sym]) {
      const p = prev.bySymbol[sym];
      const prevScore = typeof p.stability_score === "number" ? p.stability_score : null;
      const prevReg = normRegime(p.regime);

      if (prevScore !== null) {
        const delta = base - prevScore;
        if (Math.abs(delta) >= 8) {
          conf = clamp(conf - 5);
          extras.push("Variation récente.");
        }
        a.delta_score = delta; // optionnel, utile debug/UI
      }

      if (prevReg !== regime) {
        conf = clamp(conf - 10);
        a.regime_change = true; // optionnel
        extras.push("Changement de régime.");
      }
    }

    const confidence_score = conf;
    const confidence_label = labelFor(confidence_score);
    const confidence_reason = reasonFor(regime, extras);

    return {
      ...a,
      confidence_score,
      confidence_label,
      confidence_reason,
    };
  });

  // persistance non bloquante
  void writePrev(ts, enriched);

  return enriched;
}
