/* ============================================================================
 * FILE: lib/xyvala/engine/mci-decision-funnel.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala MCI decision funnel
 *
 * ROLE
 * - isolate final decision gating logic from the MCI orchestrator
 * - compute decision_score as the global weighted decision synthesis
 * - preserve WATCH as default
 * - preserve BLOCK as early rupture protection
 * - preserve ALLOW as rare score-gated outcome
 *
 * DIRECTIVES
 * - FR/EU compliance by default
 * - EUR monetary reference by default
 * - no personalized financial advice
 * - no public exploitable trading decision
 * - decision funnel only
 * - no calibration execution
 * - no store append
 * - no RFS recomputation
 * - no UI/API/cache logic
 * - deterministic output only
 * - same input => same output
 * ========================================================================== */

export type MciFunnelDecision = "ALLOW" | "WATCH" | "BLOCK";
export type MciFunnelRegime = "STABLE" | "TRANSITION" | "VOLATILE";

export type MciFunnelDecisionReason =
  | "rupture_kill_switch"
  | "temporal_gate_failed"
  | "support_gate_failed"
  | "transition_safety_gate_failed"
  | "transition_dominance_gate_failed"
  | "allow_score_passed"
  | "allow_score_below_threshold";

export type MciFunnelDominanceState =
  | "RECOVERY"
  | "RUPTURE"
  | "NEUTRAL"

export type MciFunnelThresholds = {
  allow_raw_score: number;
  block_raw_score: number;
  risk_rupture_probability: number;
  decision_support_probability: number;
};

export type RunMciDecisionFunnelInput = {
  regime: MciFunnelRegime;

  stability: number;
  opportunity: number;
  convergence: number;
  confidence: number;

  risk_rupture_probability: number;
  decision_support_probability: number;
  recovery_probability: number;

  temporal_coherence_probability: number;
  temporal_support_probability: number;

  dominance_state: MciFunnelDominanceState;

  thresholds: MciFunnelThresholds;
};

export type RunMciDecisionFunnelResult = {
  decision: MciFunnelDecision;
  decision_reason: MciFunnelDecisionReason;

  decision_score: number;
  allow_raw_score: number;
  block_raw_score: number;

  recovery_rupture_dominance: number;

  rupture_dominant: boolean;
  temporal_gate_passed: boolean;
  support_gate_passed: boolean;
  transition_safety_gate_passed: boolean;
  transition_dominance_gate_passed: boolean;

  hard_block: boolean;
  hard_allow_candidate: boolean;
};

/* ============================================================================
 * 1. HELPERS
 * ========================================================================== */

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function clampScore(value: unknown): number {
  const parsed = safeNumber(value, 0);

  if (parsed < 0) return 0;
  if (parsed > 100) return 100;

  return Math.round(parsed * 100) / 100;
}

/* ============================================================================
 * 2. SCORE BUILDER
 * ========================================================================== */

function computeDecisionScore(input: {
  stability: number;
  opportunity: number;
  convergence: number;
  confidence: number;
  support: number;
  recovery: number;
  risk: number;
}): number {
  return clampScore(
    input.stability * 0.24 +
      input.convergence * 0.18 +
      input.support * 0.18 +
      input.opportunity * 0.14 +
      input.confidence * 0.1 +
      input.recovery * 0.08 -
      input.risk * 0.26,
  );
}

/* ============================================================================
 * 3. FUNNEL
 * ========================================================================== */

export function runMciDecisionFunnel(
  input: RunMciDecisionFunnelInput,
): RunMciDecisionFunnelResult {
  const stability = clampScore(input.stability);
  const opportunity = clampScore(input.opportunity);
  const convergence = clampScore(input.convergence);
  const confidence = clampScore(input.confidence);

  const risk = clampScore(input.risk_rupture_probability);
  const support = clampScore(input.decision_support_probability);
  const recovery = clampScore(input.recovery_probability);

  const temporalCoherence = clampScore(input.temporal_coherence_probability);
  const temporalSupport = clampScore(input.temporal_support_probability);

  const thresholds: MciFunnelThresholds = {
    allow_raw_score: clampScore(input.thresholds.allow_raw_score),
    block_raw_score: clampScore(input.thresholds.block_raw_score),
    risk_rupture_probability: clampScore(
      input.thresholds.risk_rupture_probability,
    ),
    decision_support_probability: clampScore(
      input.thresholds.decision_support_probability,
    ),
  };

  const decisionScore = computeDecisionScore({
    stability,
    opportunity,
    convergence,
    confidence,
    support,
    recovery,
    risk,
  });

  const allowRawScore = decisionScore;
  const blockRawScore = risk;
  const recoveryRuptureDominance = clampScore(recovery - risk);

  const ruptureDominant =
    risk >= thresholds.risk_rupture_probability ||
    input.dominance_state === "RUPTURE";

  const temporalGatePassed =
    temporalCoherence >= 55 && temporalSupport >= 50;

  const supportGatePassed =
    support >= thresholds.decision_support_probability;

  const confidenceGatePassed = confidence >= 40;

  const transitionSafetyGatePassed =
    input.regime !== "TRANSITION" ||
    risk < thresholds.risk_rupture_probability - 8;

  const transitionDominanceGatePassed =
    input.regime !== "TRANSITION" ||
    input.dominance_state === "RECOVERY" ||
    recoveryRuptureDominance >= 8;

  const volatileAllowBlocked = input.regime === "VOLATILE";

  if (ruptureDominant) {
    return buildResult({
      decision: "BLOCK",
      decision_reason: "rupture_kill_switch",
      decisionScore,
      allowRawScore,
      blockRawScore,
      recoveryRuptureDominance,
      ruptureDominant,
      temporalGatePassed,
      supportGatePassed,
      transitionSafetyGatePassed,
      transitionDominanceGatePassed,
    });
  }

  if (!temporalGatePassed) {
    return buildResult({
      decision: "WATCH",
      decision_reason: "temporal_gate_failed",
      decisionScore,
      allowRawScore,
      blockRawScore,
      recoveryRuptureDominance,
      ruptureDominant,
      temporalGatePassed,
      supportGatePassed,
      transitionSafetyGatePassed,
      transitionDominanceGatePassed,
    });
  }

  if (!supportGatePassed) {
    return buildResult({
      decision: "WATCH",
      decision_reason: "support_gate_failed",
      decisionScore,
      allowRawScore,
      blockRawScore,
      recoveryRuptureDominance,
      ruptureDominant,
      temporalGatePassed,
      supportGatePassed,
      transitionSafetyGatePassed,
      transitionDominanceGatePassed,
    });
  }

  if (!confidenceGatePassed) {
    return buildResult({
      decision: "WATCH",
      decision_reason: "support_gate_failed",
      decisionScore,
      allowRawScore,
      blockRawScore,
      recoveryRuptureDominance,
      ruptureDominant,
      temporalGatePassed,
      supportGatePassed,
      transitionSafetyGatePassed,
      transitionDominanceGatePassed,
    });
  }

  if (!transitionSafetyGatePassed || volatileAllowBlocked) {
    return buildResult({
      decision: "WATCH",
      decision_reason: "transition_safety_gate_failed",
      decisionScore,
      allowRawScore,
      blockRawScore,
      recoveryRuptureDominance,
      ruptureDominant,
      temporalGatePassed,
      supportGatePassed,
      transitionSafetyGatePassed,
      transitionDominanceGatePassed,
    });
  }

  if (!transitionDominanceGatePassed) {
    return buildResult({
      decision: "WATCH",
      decision_reason: "transition_dominance_gate_failed",
      decisionScore,
      allowRawScore,
      blockRawScore,
      recoveryRuptureDominance,
      ruptureDominant,
      temporalGatePassed,
      supportGatePassed,
      transitionSafetyGatePassed,
      transitionDominanceGatePassed,
    });
  }

  if (decisionScore >= thresholds.allow_raw_score) {
    return buildResult({
      decision: "ALLOW",
      decision_reason: "allow_score_passed",
      decisionScore,
      allowRawScore,
      blockRawScore,
      recoveryRuptureDominance,
      ruptureDominant,
      temporalGatePassed,
      supportGatePassed,
      transitionSafetyGatePassed,
      transitionDominanceGatePassed,
    });
  }

  return buildResult({
    decision: "WATCH",
    decision_reason: "allow_score_below_threshold",
    decisionScore,
    allowRawScore,
    blockRawScore,
    recoveryRuptureDominance,
    ruptureDominant,
    temporalGatePassed,
    supportGatePassed,
    transitionSafetyGatePassed,
    transitionDominanceGatePassed,
  });
}

/* ============================================================================
 * 4. RESULT BUILDER
 * ========================================================================== */

function buildResult(input: {
  decision: MciFunnelDecision;
  decision_reason: MciFunnelDecisionReason;
  decisionScore: number;
  allowRawScore: number;
  blockRawScore: number;
  recoveryRuptureDominance: number;
  ruptureDominant: boolean;
  temporalGatePassed: boolean;
  supportGatePassed: boolean;
  transitionSafetyGatePassed: boolean;
  transitionDominanceGatePassed: boolean;
}): RunMciDecisionFunnelResult {
  return {
    decision: input.decision,
    decision_reason: input.decision_reason,

    decision_score: clampScore(input.decisionScore),
    allow_raw_score: clampScore(input.allowRawScore),
    block_raw_score: clampScore(input.blockRawScore),

    recovery_rupture_dominance: clampScore(input.recoveryRuptureDominance),

    rupture_dominant: input.ruptureDominant,
    temporal_gate_passed: input.temporalGatePassed,
    support_gate_passed: input.supportGatePassed,
    transition_safety_gate_passed: input.transitionSafetyGatePassed,
    transition_dominance_gate_passed: input.transitionDominanceGatePassed,

    hard_block: input.decision === "BLOCK",
    hard_allow_candidate: input.decision === "ALLOW",
  };
}

export {};
