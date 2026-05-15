/* ============================================================================
 * FILE: lib/xyvala/calibration/store/decision-distribution-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala decision distribution store
 *
 * ROLE
 * - store normalized DecisionSample entries in a deterministic rolling buffer
 * - expose append / read / clear / stats accessors
 * - keep persistence orchestration isolated from normalization and validation
 *
 * DIRECTIVES
 * - store orchestration only
 * - no normalization logic
 * - no validation logic
 * - no cloning logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - no public investment decision exposure
 *
 * INPUTS
 * - DecisionSampleInput
 * - SampleReadInput
 *
 * OUTPUTS
 * - SampleAppendResult
 * - SamplesAppendResult
 * - SampleReadResult
 * - StoreStats
 *
 * INVARIANTS
 * - store remains bounded
 * - reads never expose mutable internal references
 * - invalid samples are rejected explicitly
 * - same stored state => same read output
 *
 * CRITICAL DEPENDENCIES
 * - decision-distribution-normalizers.ts
 * - decision-distribution-validators.ts
 * - decision-distribution-cloners.ts
 * ========================================================================== */

import type {
  CalibrationDecision,
  CalibrationRegime,
  DecisionDistributionStoreStats,
  DecisionSample,
  DecisionSampleInput,
  ReadDecisionDistributionSamplesResult,
  SampleAppendResult,
  SampleReadInput,
  SamplesAppendResult,
} from "@/lib/xyvala/calibration/calibration-contracts";

import {
  normalizeLimit,
  normalizeSample,
  safeStr,
} from "@/lib/xyvala/calibration/store/decision-distribution-normalizers";

import {
  validateNormalizedSample,
  type ValidationReason,
} from "@/lib/xyvala/calibration/store/decision-distribution-validators";

import {
  cloneSample,
  cloneSamples,
  cloneStoreStats,
} from "@/lib/xyvala/calibration/store/decision-distribution-cloners";

/* ============================================================================
 * 1. STORE STATE
 * ========================================================================== */

const STORE_CAPACITY = 5_000;

const decisionDistributionStore: DecisionSample[] = [];

let rejectedSampleCount = 0;

let lastRejection: {
  reason: ValidationReason | null;
  ts: number | null;
  details: string[];
} = {
  reason: null,
  ts: null,
  details: [],
};

/* ============================================================================
 * 2. STORE HELPERS
 * ========================================================================== */

function lastSample(): DecisionSample | null {
  return decisionDistributionStore[decisionDistributionStore.length - 1] ?? null;
}

function boundedPush(sample: DecisionSample): void {
  decisionDistributionStore.push(sample);

  while (decisionDistributionStore.length > STORE_CAPACITY) {
    decisionDistributionStore.shift();
  }
}

function recordRejection(
  reason: ValidationReason,
  details: string[],
): void {
  rejectedSampleCount += 1;

  lastRejection = {
    reason,
    ts: Date.now(),
    details: [...details],
  };

  if (process.env.NODE_ENV === "development") {
    console.error("[XYVALA][CALIBRATION][SAMPLE_REJECTED]", {
      reason,
      details,
      rejected_sample_count: rejectedSampleCount,
    });
  }
}

/* ============================================================================
 * 3. APPEND API
 * ========================================================================== */

export function appendDecisionDistributionSample(
  sample: DecisionSampleInput,
): SampleAppendResult {
  const normalized = normalizeSample(sample);
  const validation = validateNormalizedSample(normalized);

  if (!validation.ok) {
    const reason = validation.issues[0]?.reason ?? "INVALID_SAMPLE_CONTRACT";
    const details = validation.issues.map((issue) => issue.detail);

    recordRejection(reason, details);

    return {
      ok: false,
      sample: cloneSample(normalized),
      warnings: details,
    };
  }

  boundedPush(normalized);

  return {
    ok: true,
    sample: cloneSample(normalized),
    warnings: [],
  };
}

export function appendDecisionDistributionSamples(
  samples: DecisionSampleInput[],
): SamplesAppendResult {
  const results = samples.map((sample) =>
    appendDecisionDistributionSample(sample),
  );

  const storedSamples = results
    .filter((result) => result.ok)
    .map((result) => result.sample);

  const warnings = results.flatMap((result) => result.warnings);

  return {
    ok: results.every((result) => result.ok),
    samples: cloneSamples(storedSamples),
    appended_count: storedSamples.length,
    warnings,
  };
}

/* ============================================================================
 * 4. READ API
 * ========================================================================== */

export function readDecisionDistributionSamples(
  input: SampleReadInput = {},
): ReadDecisionDistributionSamplesResult {
  const analyticalVersion = safeStr(input.analytical_version);
  const horizon = input.horizon ?? null;
  const limit = normalizeLimit(input.limit ?? 250, STORE_CAPACITY);

  const filtered = decisionDistributionStore.filter((sample) => {
    if (
      analyticalVersion &&
      sample.observed_analytical_version !== analyticalVersion
    ) {
      return false;
    }

    if (horizon && sample.observed_horizon !== horizon) {
      return false;
    }

    return true;
  });

  const samples = cloneSamples(filtered.slice(-limit));

  return {
    samples,
    total: filtered.length,
    returned: samples.length,
    limit,
  };
}

/* ============================================================================
 * 5. CLEAR API
 * ========================================================================== */

export function clearDecisionDistributionStore(): void {
  decisionDistributionStore.length = 0;
  rejectedSampleCount = 0;

  lastRejection = {
    reason: null,
    ts: null,
    details: [],
  };
}

/* ============================================================================
 * 6. STATS / AUDIT
 * ========================================================================== */

export function getDecisionDistributionStoreStats(): DecisionDistributionStoreStats {
  const decision_count: Record<CalibrationDecision, number> = {
    ALLOW: 0,
    WATCH: 0,
    BLOCK: 0,
  };

  const regime_count: Record<CalibrationRegime, number> = {
    STABLE: 0,
    TRANSITION: 0,
    VOLATILE: 0,
  };

  for (const sample of decisionDistributionStore) {
    decision_count[sample.observed_decision] += 1;
    regime_count[sample.observed_regime] += 1;
  }

  const stats: DecisionDistributionStoreStats = {
    sample_count: decisionDistributionStore.length,
    last_sample_ts: lastSample()?.observed_ts ?? null,
    decision_count,
    regime_count,
  };

  return cloneStoreStats(stats);
}
