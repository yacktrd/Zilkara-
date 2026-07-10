/* ============================================================================
 * FILE: lib/xyvala/calibration/store/decision-distribution-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala decision distribution runtime store
 *
 * ROLE
 * - store normalized DecisionSample entries in a deterministic rolling buffer
 * - expose append / read / clear / stats accessors
 * - keep persistence orchestration isolated from normalization and validation
 * - share runtime memory across Next.js route module instances
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
 * - runtime singleton through globalThis
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

type StoreRuntimeState = {
  samples: DecisionSample[];
  rejected_sample_count: number;
  last_rejection: {
    reason: ValidationReason | null;
    ts: number | null;
    details: string[];
  };
};

const STORE_KEY = "__xyvala_decision_distribution_store__";

type XyvalaGlobal = typeof globalThis & {
  [STORE_KEY]?: StoreRuntimeState;
};

function getRuntimeState(): StoreRuntimeState {
  const runtime = globalThis as XyvalaGlobal;

  if (!runtime[STORE_KEY]) {
    runtime[STORE_KEY] = {
      samples: [],
      rejected_sample_count: 0,
      last_rejection: {
        reason: null,
        ts: null,
        details: [],
      },
    };
  }

  return runtime[STORE_KEY];
}

/* ============================================================================
 * 2. STORE HELPERS
 * ========================================================================== */

function lastSample(): DecisionSample | null {
  const state = getRuntimeState();
  return state.samples[state.samples.length - 1] ?? null;
}

function boundedPush(sample: DecisionSample): void {
  const state = getRuntimeState();

  state.samples.push(sample);

  while (state.samples.length > STORE_CAPACITY) {
    state.samples.shift();
  }
}

function recordRejection(
  reason: ValidationReason,
  details: string[],
): void {
  const state = getRuntimeState();

  state.rejected_sample_count += 1;

  state.last_rejection = {
    reason,
    ts: Date.now(),
    details: [...details],
  };

  if (process.env.NODE_ENV === "development") {
    console.error("[XYVALA][CALIBRATION][SAMPLE_REJECTED]", {
      reason,
      details,
      rejected_sample_count: state.rejected_sample_count,
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

console.log(
  "[STORE_APPEND]",
  getRuntimeState().samples.length,
);

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
  const state = getRuntimeState();

  const analyticalVersion = safeStr(input.analytical_version);
  const horizon = input.horizon ?? null;
  const limit = normalizeLimit(input.limit ?? 250, STORE_CAPACITY);

  const filtered = state.samples.filter((sample) => {
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
  const state = getRuntimeState();

  state.samples.length = 0;
  state.rejected_sample_count = 0;

  state.last_rejection = {
    reason: null,
    ts: null,
    details: [],
  };
}

/* ============================================================================
 * 6. STATS / AUDIT
 * ========================================================================== */

export function getDecisionDistributionStoreStats(): DecisionDistributionStoreStats {
  const state = getRuntimeState();

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

  for (const sample of state.samples) {
    decision_count[sample.observed_decision] += 1;
    regime_count[sample.observed_regime] += 1;
  }

  const stats: DecisionDistributionStoreStats = {
    sample_count: state.samples.length,
    last_sample_ts: lastSample()?.observed_ts ?? null,
    decision_count,
    regime_count,
  };

  return cloneStoreStats(stats);
}
