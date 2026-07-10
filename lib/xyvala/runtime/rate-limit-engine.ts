/* ============================================================================
 * FILE: lib/xyvala/runtime/rate-limit-engine.ts
 * ========================================================================== */

import {
  recordSecurityEvent,
  type SecurityDecision,
  type SecuritySeverity,
} from "@/lib/xyvala/runtime/security-event-service";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RateLimitSubjectType =
  | "ip"
  | "account"
  | "api_key"
  | "session"
  | "webhook"
  | "anonymous";

export type RateLimitWindow = "minute" | "hour" | "day";

export type RateLimitDecision = "ALLOW" | "WATCH" | "BLOCK";

export type RateLimitReason =
  | "rate_limit_allowed"
  | "rate_limit_elevated"
  | "rate_limit_exceeded"
  | "rate_limit_subject_invalid";

export type RateLimitPolicy = {
  subject_type: RateLimitSubjectType;
  window: RateLimitWindow;

  max_requests: number;
  watch_threshold_pct: number;
  block_threshold_pct: number;
};

export type RateLimitInput = {
  subject_id: string;
  subject_type: RateLimitSubjectType;
  source: string;

  account_id?: string | null;
  actor_id?: string | null;
  request_id?: string | null;

  metadata?: Record<string, string | number | boolean | null>;
};

export type RateLimitState = {
  subject_id: string;
  subject_type: RateLimitSubjectType;

  source: string;
  window: RateLimitWindow;

  request_count: number;
  max_requests: number;
  usage_pct: number;

  decision: RateLimitDecision;
  reason: RateLimitReason;

  reset_at: number;

  security_severity: SecuritySeverity | null;
  security_decision: SecurityDecision | null;

  warnings: string[];
};

/* ============================================================================
 * 2. INTERNAL TYPES
 * ========================================================================== */

type RateLimitBucket = {
  count: number;
  reset_at: number;
};

type RateLimitStoreState = {
  buckets: Map<string, RateLimitBucket>;
};

/* ============================================================================
 * 3. GLOBAL STORE
 * ========================================================================== */

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_RATE_LIMIT_STORE__: RateLimitStoreState | undefined;
}

function getStore(): RateLimitStoreState {
  if (!globalThis.__XYVALA_RATE_LIMIT_STORE__) {
    globalThis.__XYVALA_RATE_LIMIT_STORE__ = {
      buckets: new Map(),
    };
  }

  return globalThis.__XYVALA_RATE_LIMIT_STORE__;
}

/* ============================================================================
 * 4. POLICIES
 * ========================================================================== */

const RATE_LIMIT_POLICIES: Record<RateLimitSubjectType, RateLimitPolicy> = {
  anonymous: {
    subject_type: "anonymous",
    window: "minute",
    max_requests: 30,
    watch_threshold_pct: 70,
    block_threshold_pct: 100,
  },

  ip: {
    subject_type: "ip",
    window: "minute",
    max_requests: 120,
    watch_threshold_pct: 75,
    block_threshold_pct: 100,
  },

  session: {
    subject_type: "session",
    window: "minute",
    max_requests: 180,
    watch_threshold_pct: 80,
    block_threshold_pct: 100,
  },

  account: {
    subject_type: "account",
    window: "minute",
    max_requests: 300,
    watch_threshold_pct: 80,
    block_threshold_pct: 100,
  },

  api_key: {
    subject_type: "api_key",
    window: "minute",
    max_requests: 600,
    watch_threshold_pct: 85,
    block_threshold_pct: 100,
  },

  webhook: {
    subject_type: "webhook",
    window: "minute",
    max_requests: 60,
    watch_threshold_pct: 70,
    block_threshold_pct: 100,
  },
};

/* ============================================================================
 * 5. HELPERS
 * ========================================================================== */

function now(): number {
  return Date.now();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
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

function resetForWindow(window: RateLimitWindow, ts: number): number {
  const date = new Date(ts);

  if (window === "day") {
    date.setHours(24, 0, 0, 0);
    return date.getTime();
  }

  if (window === "hour") {
    date.setMinutes(0, 0, 0);
    date.setHours(date.getHours() + 1);
    return date.getTime();
  }

  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);
  return date.getTime();
}

function buildBucketKey(input: {
  subject_id: string;
  subject_type: RateLimitSubjectType;
  source: string;
  window: RateLimitWindow;
}): string {
  return [
    input.subject_type,
    input.subject_id,
    input.source,
    input.window,
  ].join(":");
}

function createBucket(policy: RateLimitPolicy, ts: number): RateLimitBucket {
  return {
    count: 0,
    reset_at: resetForWindow(policy.window, ts),
  };
}

function ensureBucket(
  bucket: RateLimitBucket,
  policy: RateLimitPolicy,
  ts: number,
): RateLimitBucket {
  if (ts >= bucket.reset_at) {
    return createBucket(policy, ts);
  }

  return bucket;
}

function resolvePolicy(
  subjectType: RateLimitSubjectType,
): RateLimitPolicy {
  return RATE_LIMIT_POLICIES[subjectType];
}

function resolveDecision(input: {
  usage_pct: number;
  policy: RateLimitPolicy;
}): {
  decision: RateLimitDecision;
  reason: RateLimitReason;
} {
  if (input.usage_pct >= input.policy.block_threshold_pct) {
    return {
      decision: "BLOCK",
      reason: "rate_limit_exceeded",
    };
  }

  if (input.usage_pct >= input.policy.watch_threshold_pct) {
    return {
      decision: "WATCH",
      reason: "rate_limit_elevated",
    };
  }

  return {
    decision: "ALLOW",
    reason: "rate_limit_allowed",
  };
}

/* ============================================================================
 * 6. ENGINE
 * ========================================================================== */

export function evaluateRateLimit(
  input: RateLimitInput,
): RateLimitState {
  const subjectId = safeString(input.subject_id);
  const source = safeString(input.source) || "unknown_source";
  const policy = resolvePolicy(input.subject_type);

  if (!subjectId) {
    return {
      subject_id: "",
      subject_type: input.subject_type,

      source,
      window: policy.window,

      request_count: 0,
      max_requests: policy.max_requests,
      usage_pct: 100,

      decision: "BLOCK",
      reason: "rate_limit_subject_invalid",

      reset_at: resetForWindow(policy.window, now()),

      security_severity: "medium",
      security_decision: "WARN",

      warnings: ["rate_limit_subject_invalid"],
    };
  }

  const ts = now();
  const store = getStore();

  const bucketKey = buildBucketKey({
    subject_id: subjectId,
    subject_type: input.subject_type,
    source,
    window: policy.window,
  });

  const bucket = ensureBucket(
    store.buckets.get(bucketKey) ?? createBucket(policy, ts),
    policy,
    ts,
  );

  bucket.count += 1;
  store.buckets.set(bucketKey, bucket);

  const usagePct = clampPct((bucket.count / policy.max_requests) * 100);

  const decision = resolveDecision({
    usage_pct: usagePct,
    policy,
  });

  let securitySeverity: SecuritySeverity | null = null;
  let securityDecision: SecurityDecision | null = null;

  if (decision.decision === "BLOCK") {
    const security = recordSecurityEvent({
      kind: "rate_limit_suspected",
      account_id: input.account_id ?? null,
      actor_id: input.actor_id ?? null,
      request_id: input.request_id ?? null,
      source: "rate_limit_engine",
      message: "Rate limit threshold exceeded.",
      metadata: {
        subject_type: input.subject_type,
        source,
        request_count: bucket.count,
        max_requests: policy.max_requests,
        usage_pct: usagePct,
        ...(input.metadata ?? {}),
      },
      warnings: ["rate_limit_exceeded"],
    });

    securitySeverity = security.severity;
    securityDecision = security.decision;
  }

  return {
    subject_id: subjectId,
    subject_type: input.subject_type,

    source,
    window: policy.window,

    request_count: bucket.count,
    max_requests: policy.max_requests,
    usage_pct: usagePct,

    decision: decision.decision,
    reason: decision.reason,

    reset_at: bucket.reset_at,

    security_severity: securitySeverity,
    security_decision: securityDecision,

    warnings: uniqueWarnings(
      decision.decision !== "ALLOW" ? [decision.reason] : [],
    ),
  };
}

export function getRateLimitSnapshot(
  input: RateLimitInput,
): RateLimitState {
  const subjectId = safeString(input.subject_id);
  const source = safeString(input.source) || "unknown_source";
  const policy = resolvePolicy(input.subject_type);
  const ts = now();

  const bucketKey = buildBucketKey({
    subject_id: subjectId,
    subject_type: input.subject_type,
    source,
    window: policy.window,
  });

  const bucket = ensureBucket(
    getStore().buckets.get(bucketKey) ?? createBucket(policy, ts),
    policy,
    ts,
  );

  const usagePct = clampPct((bucket.count / policy.max_requests) * 100);

  const decision = resolveDecision({
    usage_pct: usagePct,
    policy,
  });

  return {
    subject_id: subjectId,
    subject_type: input.subject_type,

    source,
    window: policy.window,

    request_count: bucket.count,
    max_requests: policy.max_requests,
    usage_pct: usagePct,

    decision: decision.decision,
    reason: decision.reason,

    reset_at: bucket.reset_at,

    security_severity: null,
    security_decision: null,

    warnings: uniqueWarnings(
      decision.decision !== "ALLOW" ? [decision.reason] : [],
    ),
  };
}

/* ============================================================================
 * 7. MAINTENANCE
 * ========================================================================== */

export function clearRateLimitStore(): void {
  getStore().buckets.clear();
}

export function getRateLimitStoreStats(): {
  buckets: number;
} {
  return {
    buckets: getStore().buckets.size,
  };
}
