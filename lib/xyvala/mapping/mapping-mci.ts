/* ============================================================================
 * FILE: lib/xyvala/mapping/mapping-mci.ts
 * ========================================================================== */

import type { MappingRfsResult } from "@/lib/xyvala/mapping/mapping-rfs";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type MappingPropagationDecision = "ALLOW" | "WATCH" | "BLOCK";
export type MappingPropagationMode = "FULL" | "DEGRADED" | "BLOCKED";

export type MappingSourceMode = "FULL" | "DEGRADED" | "EMERGENCY";
export type MappingFallbackLevel = 0 | 1 | 2;

export type MappingDominanceState =
  | "READINESS_DOMINANT"
  | "RISK_DOMINANT"
  | "BALANCED";

export type MappingSignals = {
  coverage_score: number;
  schema_alignment_score: number;
  stability_score: number;
  rupture_score: number;
  critical_missing_score: number;
  collision_score: number;
  null_pressure_score: number;
  rejection_pressure_score: number;
  identity_fragility_score: number;
  identity_convergence_score: number;
  consistency_score: number;
  correlation_score: number;
  identity_duration_score: number;
  structure_score: number;
};

export type MappingMciResult = {
  mapping_propagation_decision: MappingPropagationDecision;
  mapping_propagation_mode: MappingPropagationMode;

  source_mode: MappingSourceMode;
  fallback_level: MappingFallbackLevel;
  degradation_score: number;
  propagation_usable: boolean;

  mapping_readiness_score: number;
  mapping_convergence_score: number;
  mapping_confidence_score: number;

  risk_rupture_score: number;
  propagation_risk_score: number;

  dominance_score: number;
  dominance_state: MappingDominanceState;

  mapping_reference_matches: number;

  degraded_fields: string[];
  blocking_reasons: string[];
  warnings: string[];
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
    ),
  ];
}

/* ============================================================================
 * 3. SIGNAL EXTRACTION
 * ========================================================================== */

function buildSignals(rfs: MappingRfsResult): MappingSignals {
  return {
    coverage_score: clampScore(rfs.mapping_field_coverage_score),
    schema_alignment_score: clampScore(rfs.mapping_schema_alignment_score),
    stability_score: clampScore(rfs.mapping_stability),
    rupture_score: clampScore(rfs.mapping_rupture_score),
    critical_missing_score: clampScore(rfs.mapping_critical_missing_score),
    collision_score: clampScore(rfs.mapping_collision_score),
    null_pressure_score: clampScore(rfs.mapping_null_pressure_score),
    rejection_pressure_score: clampScore(rfs.mapping_rejection_pressure_score),
    identity_fragility_score: clampScore(rfs.mapping_identity_fragility_score),
    identity_convergence_score: clampScore(
      rfs.mapping_identity_convergence_score,
    ),
    consistency_score: clampScore(rfs.mapping_consistency_score),
    correlation_score: clampScore(rfs.mapping_correlation_score),
    identity_duration_score: clampScore(rfs.mapping_identity_duration_score),
    structure_score: clampScore(rfs.mapping_structure_score),
  };
}

/* ============================================================================
 * 4. SCORING
 * ========================================================================== */

function computeMappingConvergenceScore(signals: MappingSignals): number {
  return clampScore(
    signals.identity_convergence_score * 0.35 +
      signals.schema_alignment_score * 0.3 +
      signals.consistency_score * 0.2 +
      signals.correlation_score * 0.15,
  );
}

function computeMappingConfidenceScore(input: {
  signals: MappingSignals;
  convergenceScore: number;
}): number {
  const { signals, convergenceScore } = input;

  return clampScore(
    signals.stability_score * 0.25 +
      convergenceScore * 0.2 +
      signals.identity_duration_score * 0.15 +
      (100 - signals.rupture_score) * 0.15 +
      (100 - signals.collision_score) * 0.1 +
      (100 - signals.critical_missing_score) * 0.1 +
      (100 - signals.identity_fragility_score) * 0.05,
  );
}

function computeMappingReadinessScore(input: {
  signals: MappingSignals;
  convergenceScore: number;
}): number {
  const { signals, convergenceScore } = input;

  return clampScore(
    signals.structure_score * 0.25 +
      signals.stability_score * 0.2 +
      signals.coverage_score * 0.15 +
      signals.schema_alignment_score * 0.15 +
      convergenceScore * 0.1 +
      (100 - signals.rejection_pressure_score) * 0.05 +
      (100 - signals.collision_score) * 0.05 +
      (100 - signals.critical_missing_score) * 0.05,
  );
}

function computeRiskRuptureScore(signals: MappingSignals): number {
  return clampScore(
    signals.rupture_score * 0.45 +
      signals.collision_score * 0.15 +
      signals.critical_missing_score * 0.15 +
      signals.identity_fragility_score * 0.1 +
      (100 - signals.stability_score) * 0.1 +
      (100 - signals.schema_alignment_score) * 0.05,
  );
}

function computePropagationRiskScore(input: {
  signals: MappingSignals;
  readinessScore: number;
  confidenceScore: number;
  riskRuptureScore: number;
}): number {
  const { signals, readinessScore, confidenceScore, riskRuptureScore } = input;

  return clampScore(
    riskRuptureScore * 0.3 +
      signals.critical_missing_score * 0.18 +
      signals.collision_score * 0.12 +
      signals.rejection_pressure_score * 0.1 +
      signals.null_pressure_score * 0.08 +
      (100 - readinessScore) * 0.12 +
      (100 - confidenceScore) * 0.1,
  );
}

function computeDominance(input: {
  readinessScore: number;
  propagationRiskScore: number;
}): {
  dominance_score: number;
  dominance_state: MappingDominanceState;
} {
  const dominanceScore = clampScore(
    input.readinessScore - input.propagationRiskScore + 50,
  );

  if (dominanceScore >= 60) {
    return {
      dominance_score: dominanceScore,
      dominance_state: "READINESS_DOMINANT",
    };
  }

  if (dominanceScore <= 40) {
    return {
      dominance_score: dominanceScore,
      dominance_state: "RISK_DOMINANT",
    };
  }

  return {
    dominance_score: dominanceScore,
    dominance_state: "BALANCED",
  };
}

/* ============================================================================
 * 5. DEGRADATION / BLOCKING
 * ========================================================================== */

function buildDegradedFields(signals: MappingSignals): string[] {
  const degraded: string[] = [];

  if (signals.null_pressure_score > 40) {
    degraded.push("optional_market_fields_under_pressure");
  }

  if (signals.rejection_pressure_score > 20) {
    degraded.push("provider_rejection_pressure_high");
  }

  if (signals.identity_fragility_score > 35) {
    degraded.push("identity_fragility_detected");
  }

  if (signals.schema_alignment_score < 80) {
    degraded.push("schema_alignment_not_strong");
  }

  if (signals.stability_score < 60) {
    degraded.push("mapping_stability_not_strong");
  }

  if (signals.coverage_score < 80) {
    degraded.push("field_coverage_not_strong");
  }

  if (signals.rupture_score >= 65) {
    degraded.push("rupture_pressure_high");
  }

  if (signals.collision_score >= 55) {
    degraded.push("collision_pressure_high");
  }

  return degraded;
}

function buildHardBlockingReasons(input: {
  rfs: MappingRfsResult;
  signals: MappingSignals;
  readinessScore: number;
  confidenceScore: number;
  riskRuptureScore: number;
  propagationRiskScore: number;
}): string[] {
  const {
    rfs,
    signals,
    readinessScore,
    confidenceScore,
    riskRuptureScore,
    propagationRiskScore,
  } = input;

  const reasons: string[] = [];

  if (rfs.count_valid === 0) {
    reasons.push("mapping_no_valid_assets");
  }

  if (signals.coverage_score < 35) {
    reasons.push("mapping_field_coverage_critically_low");
  }

  if (signals.schema_alignment_score < 45) {
    reasons.push("mapping_schema_alignment_critically_low");
  }

  if (signals.stability_score < 20) {
    reasons.push("mapping_stability_critically_low");
  }

  if (signals.critical_missing_score >= 75) {
    reasons.push("mapping_critical_fields_missing_critically_high");
  }

  if (riskRuptureScore >= 85) {
    reasons.push("mapping_rupture_risk_critical");
  }

  if (propagationRiskScore >= 85) {
    reasons.push("mapping_propagation_risk_critical");
  }

  if (readinessScore < 30 && confidenceScore < 30) {
    reasons.push("mapping_readiness_and_confidence_critically_low");
  }

  return reasons;
}

/* ============================================================================
 * 6. PROPAGATION GOVERNANCE
 * ========================================================================== */

function resolveDecision(input: {
  rfs: MappingRfsResult;
  signals: MappingSignals;
  readinessScore: number;
  confidenceScore: number;
  riskRuptureScore: number;
  propagationRiskScore: number;
  dominanceState: MappingDominanceState;
  degradedFields: string[];
  hardBlockingReasons: string[];
}): {
  decision: MappingPropagationDecision;
  mode: MappingPropagationMode;
  warnings: string[];
} {
  const {
    rfs,
    signals,
    readinessScore,
    confidenceScore,
    riskRuptureScore,
    propagationRiskScore,
    dominanceState,
    degradedFields,
    hardBlockingReasons,
  } = input;

  if (hardBlockingReasons.length > 0) {
    return {
      decision: "BLOCK",
      mode: "BLOCKED",
      warnings: uniqueWarnings(rfs.warnings, [
        "mapping_propagation_decision_block",
      ]),
    };
  }

  const degraded =
    degradedFields.length > 0 ||
    signals.stability_score < 65 ||
    signals.schema_alignment_score < 82 ||
    signals.coverage_score < 82 ||
    riskRuptureScore >= 55 ||
    propagationRiskScore >= 55 ||
    readinessScore < 78 ||
    confidenceScore < 70 ||
    dominanceState !== "READINESS_DOMINANT";

  if (degraded) {
    return {
      decision: "WATCH",
      mode: "DEGRADED",
      warnings: uniqueWarnings(rfs.warnings, [
        "mapping_propagation_decision_watch",
      ]),
    };
  }

  return {
    decision: "ALLOW",
    mode: "FULL",
    warnings: uniqueWarnings(rfs.warnings, [
      "mapping_propagation_decision_allow",
    ]),
  };
}

function resolveSourceMode(input: {
  decision: MappingPropagationDecision;
  mode: MappingPropagationMode;
}): MappingSourceMode {
  if (input.decision === "ALLOW" && input.mode === "FULL") return "FULL";

  if (input.decision === "BLOCK" || input.mode === "BLOCKED") {
    return "EMERGENCY";
  }

  return "DEGRADED";
}

function resolveFallbackLevel(sourceMode: MappingSourceMode): MappingFallbackLevel {
  if (sourceMode === "FULL") return 0;
  if (sourceMode === "DEGRADED") return 1;
  return 2;
}

function computeDegradationScore(input: {
  readinessScore: number;
  confidenceScore: number;
  propagationRiskScore: number;
  riskRuptureScore: number;
  degradedFieldsCount: number;
  blockingReasonsCount: number;
  sourceMode: MappingSourceMode;
}): number {
  const modePenalty =
    input.sourceMode === "FULL" ? 0 : input.sourceMode === "DEGRADED" ? 20 : 45;

  return clampScore(
    (100 - input.readinessScore) * 0.25 +
      (100 - input.confidenceScore) * 0.18 +
      input.propagationRiskScore * 0.24 +
      input.riskRuptureScore * 0.18 +
      Math.min(input.degradedFieldsCount * 4, 20) * 0.08 +
      Math.min(input.blockingReasonsCount * 12, 36) * 0.04 +
      modePenalty * 0.03,
  );
}

/* ============================================================================
 * 7. EXECUTION
 * ========================================================================== */

export function runMappingMci(rfs: MappingRfsResult): MappingMciResult {
  const signals = buildSignals(rfs);

  const mappingConvergenceScore = computeMappingConvergenceScore(signals);

  const mappingConfidenceScore = computeMappingConfidenceScore({
    signals,
    convergenceScore: mappingConvergenceScore,
  });

  const mappingReadinessScore = computeMappingReadinessScore({
    signals,
    convergenceScore: mappingConvergenceScore,
  });

  const riskRuptureScore = computeRiskRuptureScore(signals);

  const propagationRiskScore = computePropagationRiskScore({
    signals,
    readinessScore: mappingReadinessScore,
    confidenceScore: mappingConfidenceScore,
    riskRuptureScore,
  });

  const dominance = computeDominance({
    readinessScore: mappingReadinessScore,
    propagationRiskScore,
  });

  const degradedFields = buildDegradedFields(signals);

  const hardBlockingReasons = buildHardBlockingReasons({
    rfs,
    signals,
    readinessScore: mappingReadinessScore,
    confidenceScore: mappingConfidenceScore,
    riskRuptureScore,
    propagationRiskScore,
  });

  const resolved = resolveDecision({
    rfs,
    signals,
    readinessScore: mappingReadinessScore,
    confidenceScore: mappingConfidenceScore,
    riskRuptureScore,
    propagationRiskScore,
    dominanceState: dominance.dominance_state,
    degradedFields,
    hardBlockingReasons,
  });

  const sourceMode = resolveSourceMode({
    decision: resolved.decision,
    mode: resolved.mode,
  });

  const fallbackLevel = resolveFallbackLevel(sourceMode);

  const degradationScore = computeDegradationScore({
    readinessScore: mappingReadinessScore,
    confidenceScore: mappingConfidenceScore,
    propagationRiskScore,
    riskRuptureScore,
    degradedFieldsCount: degradedFields.length,
    blockingReasonsCount: hardBlockingReasons.length,
    sourceMode,
  });

  return {
    mapping_propagation_decision: resolved.decision,
    mapping_propagation_mode: resolved.mode,

    source_mode: sourceMode,
    fallback_level: fallbackLevel,
    degradation_score: degradationScore,
    propagation_usable: resolved.decision !== "BLOCK",

    mapping_readiness_score: mappingReadinessScore,
    mapping_convergence_score: mappingConvergenceScore,
    mapping_confidence_score: mappingConfidenceScore,

    risk_rupture_score: riskRuptureScore,
    propagation_risk_score: propagationRiskScore,

    dominance_score: dominance.dominance_score,
    dominance_state: dominance.dominance_state,

    mapping_reference_matches: rfs.count_valid,

    degraded_fields: resolved.decision === "BLOCK" ? [] : degradedFields,
    blocking_reasons: hardBlockingReasons,
    warnings: resolved.warnings,
  };
}
