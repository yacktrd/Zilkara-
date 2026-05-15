/* ============================================================================
 * FILE: lib/xyvala/services/assets-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public assets service
 *
 * ROLE
 * - orchestrate public assets loading
 * - apply deterministic public query pipeline
 * - build contract-safe public assets responses
 *
 * PARENTS
 * - lib/xyvala/assets/assets-provider.ts
 * - lib/xyvala/assets/assets-query.ts
 * - lib/xyvala/assets/assets-builder.ts
 * - lib/xyvala/assets/assets-cache.ts
 * - lib/xyvala/assets/assets-contract.ts
 *
 * DIRECTIVES
 * - service orchestration only
 * - public descriptive assets only
 * - EUR is the default quote
 * - no route logic
 * - no provider internals
 * - no cache internals
 * - no UI logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - deterministic output only
 * ========================================================================== */

import {
  buildAssetsCacheKey,
  getAssetsCache,
  setAssetsCache,
} from "@/lib/xyvala/assets/assets-cache";

import {
  buildAssetsErrorResponse,
  buildAssetsResponse,
  type AssetsResponse,
} from "@/lib/xyvala/assets/assets-builder";

import {
  loadAssetsProvider,
} from "@/lib/xyvala/assets/assets-provider";

import {
  normalizeAssetsParams,
  queryAssets,
} from "@/lib/xyvala/assets/assets-query";

import type {
  AssetsServiceInput,
} from "@/lib/xyvala/assets/assets-contract";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const CACHE_TTL_MS = 30_000;

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

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
 * 3. PUBLIC SERVICE
 * ========================================================================== */

export async function getAssetsService(
  input: AssetsServiceInput = {},
): Promise<AssetsResponse> {
  const params = normalizeAssetsParams(input);

  const cacheKey = buildAssetsCacheKey({
    quote: params.quote,
    q: params.q,
    sort: params.sort,
    order: params.order,
    limit: params.limit,
    cursor: params.cursor,
  });

  if (!params.noStore) {
    const cached = getAssetsCache<AssetsResponse>(
      cacheKey,
      CACHE_TTL_MS,
    );

    if (cached) {
      return {
        ...cached,
        source: "cache",
        meta: {
          ...cached.meta,
          cache: "hit",
        },
      };
    }
  }

  const provider = await loadAssetsProvider({
    quote: params.quote,
  });

  if (!provider.ok || provider.data.length === 0) {
    return buildAssetsErrorResponse({
      quote: params.quote,
      q: params.q,
      sort: params.sort,
      order: params.order,
      limit: params.limit,
      cursor: params.cursor,
      warnings: uniqueWarnings(
        provider.warnings,
        params.unsupported_market
          ? ["unsupported_market_forced_crypto"]
          : [],
      ),
      error: provider.error ?? "assets_provider_failed",
    });
  }

  const queried = queryAssets({
    data: provider.data,
    q: params.q,
    sort: params.sort,
    order: params.order,
    cursor: params.cursor,
    limit: params.limit,
  });

  const response = buildAssetsResponse({
    ok: true,
    source: provider.source,
    quote: params.quote,
    q: params.q,
    sort: params.sort,
    order: params.order,
    limit: params.limit,
    cursor: params.cursor,
    nextCursor: queried.nextCursor,
    cache: params.noStore ? "no-store" : "miss",
    data: queried.data,
    total: queried.total,
    warnings: uniqueWarnings(
      provider.warnings,
      params.unsupported_market
        ? ["unsupported_market_forced_crypto"]
        : [],
    ),
    error: null,
  });

  if (!params.noStore) {
    setAssetsCache(cacheKey, response);
  }

  return response;
}
