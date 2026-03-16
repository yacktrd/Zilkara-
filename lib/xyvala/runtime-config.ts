// lib/xyvala/runtime-config.ts

import type { ApiPlan } from "@/lib/xyvala/usage";

export type XyvalaRuntimeConfig = {
  version: number;

  flags: {
    enableMarketStatePanel: boolean;
    enableAdminRoutes: boolean;
    enableSecondaryEnrichment: boolean;
    degradedModeEnabled: boolean;
  };

  timeouts: {
    internalApiMs: number;
    marketStateMs: number;
  };

  scan: {
    defaultQuote: "usd" | "usdt" | "eur";
    defaultSort: string;
    defaultLimit: number;
    maxLimit: number;
  };

  cache: {
    stateTtlMs: number;
    contextTtlMs: number;
  };

  plans: Record<
    ApiPlan,
    {
      scanLimit: number;
      marketStateEnabled: boolean;
    }
  >;
};

const DEFAULT_CONFIG = Object.freeze({
  version: 1,

  flags: {
    enableMarketStatePanel: true,
    enableAdminRoutes: true,
    enableSecondaryEnrichment: true,
    degradedModeEnabled: false,
  },

  timeouts: {
    internalApiMs: 6000,
    marketStateMs: 3500,
  },

  scan: {
    defaultQuote: "usd",
    defaultSort: "score_desc",
    defaultLimit: 100,
    maxLimit: 200,
  },

  cache: {
    stateTtlMs: 30_000,
    contextTtlMs: 30_000,
  },

  plans: {
    internal: {
      scanLimit: 500,
      marketStateEnabled: true,
    },
    demo: {
      scanLimit: 25,
      marketStateEnabled: true,
    },
    trader: {
      scanLimit: 100,
      marketStateEnabled: true,
    },
    pro: {
      scanLimit: 200,
      marketStateEnabled: true,
    },
    enterprise: {
      scanLimit: 500,
      marketStateEnabled: true,
    },
  },
} satisfies XyvalaRuntimeConfig);

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeInt(
  value: unknown,
  fallback: number,
  min?: number,
  max?: number
): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value.trim(), 10)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  let result = Math.trunc(parsed);

  if (typeof min === "number") result = Math.max(min, result);
  if (typeof max === "number") result = Math.min(max, result);

  return result;
}

function safeBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;

  const normalized = safeStr(value).toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "on"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no" ||
    normalized === "off"
  ) {
    return false;
  }

  return fallback;
}

function safeQuote(
  value: unknown,
  fallback: XyvalaRuntimeConfig["scan"]["defaultQuote"]
): XyvalaRuntimeConfig["scan"]["defaultQuote"] {
  const normalized = safeStr(value).toLowerCase();

  if (normalized === "usd" || normalized === "usdt" || normalized === "eur") {
    return normalized;
  }

  return fallback;
}

function cloneDefaultConfig(): XyvalaRuntimeConfig {
  return {
    version: DEFAULT_CONFIG.version,

    flags: {
      ...DEFAULT_CONFIG.flags,
    },

    timeouts: {
      ...DEFAULT_CONFIG.timeouts,
    },

    scan: {
      ...DEFAULT_CONFIG.scan,
    },

    cache: {
      ...DEFAULT_CONFIG.cache,
    },

    plans: {
      internal: { ...DEFAULT_CONFIG.plans.internal },
      demo: { ...DEFAULT_CONFIG.plans.demo },
      trader: { ...DEFAULT_CONFIG.plans.trader },
      pro: { ...DEFAULT_CONFIG.plans.pro },
      enterprise: { ...DEFAULT_CONFIG.plans.enterprise },
    },
  };
}

function loadConfigFromEnv(base: XyvalaRuntimeConfig): XyvalaRuntimeConfig {
  const next = cloneDefaultConfig();

  next.version = safeInt(process.env.XYVALA_CONFIG_VERSION, base.version, 1);

  next.flags.enableMarketStatePanel = safeBool(
    process.env.XYVALA_ENABLE_MARKET_STATE_PANEL,
    base.flags.enableMarketStatePanel
  );

  next.flags.enableAdminRoutes = safeBool(
    process.env.XYVALA_ENABLE_ADMIN_ROUTES,
    base.flags.enableAdminRoutes
  );

  next.flags.enableSecondaryEnrichment = safeBool(
    process.env.XYVALA_ENABLE_SECONDARY_ENRICHMENT,
    base.flags.enableSecondaryEnrichment
  );

  next.flags.degradedModeEnabled = safeBool(
    process.env.XYVALA_DEGRADED_MODE,
    base.flags.degradedModeEnabled
  );

  next.timeouts.internalApiMs = safeInt(
    process.env.XYVALA_INTERNAL_API_TIMEOUT_MS,
    base.timeouts.internalApiMs,
    1000,
    30000
  );

  next.timeouts.marketStateMs = safeInt(
    process.env.XYVALA_MARKET_STATE_TIMEOUT_MS,
    base.timeouts.marketStateMs,
    1000,
    15000
  );

  next.scan.defaultQuote = safeQuote(
    process.env.XYVALA_SCAN_DEFAULT_QUOTE,
    base.scan.defaultQuote
  );

  next.scan.defaultSort =
    safeStr(process.env.XYVALA_SCAN_DEFAULT_SORT) || base.scan.defaultSort;

  next.scan.defaultLimit = safeInt(
    process.env.XYVALA_SCAN_DEFAULT_LIMIT,
    base.scan.defaultLimit,
    1,
    1000
  );

  next.scan.maxLimit = safeInt(
    process.env.XYVALA_SCAN_MAX_LIMIT,
    base.scan.maxLimit,
    1,
    5000
  );

  next.cache.stateTtlMs = safeInt(
    process.env.XYVALA_STATE_TTL_MS,
    base.cache.stateTtlMs,
    1000,
    300000
  );

  next.cache.contextTtlMs = safeInt(
    process.env.XYVALA_CONTEXT_TTL_MS,
    base.cache.contextTtlMs,
    1000,
    300000
  );

  next.plans.internal.scanLimit = safeInt(
    process.env.XYVALA_PLAN_INTERNAL_SCAN_LIMIT,
    base.plans.internal.scanLimit,
    1,
    5000
  );

  next.plans.demo.scanLimit = safeInt(
    process.env.XYVALA_PLAN_DEMO_SCAN_LIMIT,
    base.plans.demo.scanLimit,
    1,
    next.scan.maxLimit
  );

  next.plans.trader.scanLimit = safeInt(
    process.env.XYVALA_PLAN_TRADER_SCAN_LIMIT,
    base.plans.trader.scanLimit,
    1,
    next.scan.maxLimit
  );

  next.plans.pro.scanLimit = safeInt(
    process.env.XYVALA_PLAN_PRO_SCAN_LIMIT,
    base.plans.pro.scanLimit,
    1,
    next.scan.maxLimit
  );

  next.plans.enterprise.scanLimit = safeInt(
    process.env.XYVALA_PLAN_ENTERPRISE_SCAN_LIMIT,
    base.plans.enterprise.scanLimit,
    1,
    5000
  );

  next.plans.internal.marketStateEnabled = safeBool(
    process.env.XYVALA_PLAN_INTERNAL_MARKET_STATE_ENABLED,
    base.plans.internal.marketStateEnabled
  );

  next.plans.demo.marketStateEnabled = safeBool(
    process.env.XYVALA_PLAN_DEMO_MARKET_STATE_ENABLED,
    base.plans.demo.marketStateEnabled
  );

  next.plans.trader.marketStateEnabled = safeBool(
    process.env.XYVALA_PLAN_TRADER_MARKET_STATE_ENABLED,
    base.plans.trader.marketStateEnabled
  );

  next.plans.pro.marketStateEnabled = safeBool(
    process.env.XYVALA_PLAN_PRO_MARKET_STATE_ENABLED,
    base.plans.pro.marketStateEnabled
  );

  next.plans.enterprise.marketStateEnabled = safeBool(
    process.env.XYVALA_PLAN_ENTERPRISE_MARKET_STATE_ENABLED,
    base.plans.enterprise.marketStateEnabled
  );

  return next;
}

let cachedRuntimeConfig: XyvalaRuntimeConfig | null = null;

export function getRuntimeConfig(): XyvalaRuntimeConfig {
  if (cachedRuntimeConfig) {
    return cachedRuntimeConfig;
  }

  cachedRuntimeConfig = loadConfigFromEnv(cloneDefaultConfig());
  return cachedRuntimeConfig;
}

export function refreshRuntimeConfig(): XyvalaRuntimeConfig {
  cachedRuntimeConfig = loadConfigFromEnv(cloneDefaultConfig());
  return cachedRuntimeConfig;
}

export function clearRuntimeConfigCache(): void {
  cachedRuntimeConfig = null;
}

export function getRuntimeConfigVersion(): number {
  return getRuntimeConfig().version;
}
