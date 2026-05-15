/* ============================================================================
 * FILE: lib/xyvala/engine/recovery-rupture-comparator.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - compute rupture vs recovery dynamics
 * - expose dominance, pressure, strength and risk for MCI layer
 *
 * INVARIANTS
 * - deterministic
 * - scores in [0,100]
 * ========================================================================== */

import type { RfsMarketResult } from "@/lib/xyvala/engine/rfs-market";

export type RecoveryRuptureDominanceState =
  | "RECOVERY_DOMINANT"
  | "RUPTURE_DOMINANT"
  | "BALANCED";

export type RecoveryRuptureResult = {
  recovery_strength: number;
  rupture_pressure: number;
  dominance_score: number;
  dominance_state: RecoveryRuptureDominanceState;
  confidence: number;
  warnings: string[];
};

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v * 100) / 100;
}

/* ============================================================================
 * CORE
 * ========================================================================== */

export function runRecoveryRuptureComparator(
  rfs: RfsMarketResult,
): RecoveryRuptureResult {
  const warnings: string[] = [];

  // --- RUPTURE PRESSURE ---
  const rupture_pressure = clamp(
    rfs.scores.rupture * 0.55 +
    (100 - rfs.scores.stability) * 0.25 +
    (100 - rfs.scores.duration) * 0.1 +
    (100 - rfs.scores.frequency) * 0.1
  );

  // --- RECOVERY STRENGTH ---
  const recovery_strength = clamp(
    rfs.scores.convergence * 0.3 +
    rfs.scores.frequency * 0.2 +
    rfs.scores.duration * 0.2 +
    rfs.scores.correlation * 0.15 +
    (100 - rfs.scores.rupture) * 0.15
  );

  // --- DOMINANCE SCORE ---
  const dominance_score = clamp(
    recovery_strength - rupture_pressure + 50
  );

  // --- DOMINANCE STATE ---
  let dominance_state: RecoveryRuptureDominanceState = "BALANCED";

  if (dominance_score >= 60) {
    dominance_state = "RECOVERY_DOMINANT";
  } else if (dominance_score <= 40) {
    dominance_state = "RUPTURE_DOMINANT";
  }

  // --- CONFIDENCE ---
  const confidence = clamp(
    Math.abs(recovery_strength - rupture_pressure) * 0.8 +
    rfs.quality.confidence * 0.2
  );

  // --- WARNINGS ---
  if (rupture_pressure > 70 && recovery_strength < 40) {
    warnings.push("strong_structural_break_risk");
  }

  if (recovery_strength > 65 && rupture_pressure < 45) {
    warnings.push("clean_recovery_structure");
  }

  if (dominance_state === "BALANCED") {
    warnings.push("indecisive_structure");
  }

  return {
    recovery_strength,
    rupture_pressure,
    dominance_score,
    dominance_state,
    confidence,
    warnings,
  };
}
