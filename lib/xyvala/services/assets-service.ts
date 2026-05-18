/* ============================================================================
 * FILE: lib/xyvala/services/assets-service.ts
 * ========================================================================== */

import type { AccessScope } from "@/lib/xyvala/access/access-types";

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

import { loadAssetsProvider } from "@/lib/xyvala/assets/assets-provider";

import {
  normalizeAssetsParams,
  queryAssets,
} from "@/lib/xyvala/assets/assets-query";

import type { AssetsServiceInput } from "@/lib/xyvala/assets/assets-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type GetAssetsServiceInput = AssetsServiceInput & {
  access?: AccessScope | null;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const CACHE_TTL_MS = 30_000;

/* ============================================================================
 * 3. SAFE HELPERS
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

function resolveEffectiveLimit(input: {
  requestedLimit: number | null;
  access: AccessScope | null | undefined;
}): number | null {
  const accessLimit = input.access?.maxAssets ?? null;

  if (accessLimit === null) {
    return input.requestedLimit;
  }

  if (input.requestedLimit === null) {
    return accessLimit;
  }

  return Math.min(input.requestedLimit, accessLimit);
}

function buildAccessWarnings(access: AccessScope | null | undefined): string[] {
  if (!access) return [];

  return [
    `assets_access_compartment:${access.compartment}`,
    `assets_access_max_assets:${access.maxAssets}`,
  ];
}

/* ============================================================================
 * 4. PUBLIC SERVICE
 * ========================================================================== */

export async function getAssetsService(
  input: GetAssetsServiceInput = {},
): Promise<AssetsResponse> {
  const params = normalizeAssetsParams(input);

  const effectiveLimit = resolveEffectiveLimit({
    requestedLimit: params.limit,
    access: input.access,
  });

   const resolvedLimit = effectiveLimit ?? params.limit ?? 0;

  const accessWarnings = buildAccessWarnings(input.access);

  const cacheKey = buildAssetsCacheKey({
    quote: params.quote,
    q: params.q,
    sort: params.sort,
    order: params.order,
    limit: resolvedLimit,
    cursor: params.cursor,
  });

  if (!params.noStore) {
    const cached = getAssetsCache<AssetsResponse>(cacheKey, CACHE_TTL_MS);

    if (cached) {
      return {
        ...cached,
        source: "cache",
        meta: {
          ...cached.meta,
          cache: "hit",
          warnings: uniqueWarnings(cached.meta.warnings, accessWarnings),
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
      limit: resolvedLimit,
      cursor: params.cursor,
      warnings: uniqueWarnings(
        provider.warnings,
        accessWarnings,
        params.unsupported_market ? ["unsupported_market_forced_crypto"] : [],
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
    limit: resolvedLimit,
  });

  const response = buildAssetsResponse({
    ok: true,
    source: provider.source,
    quote: params.quote,
    q: params.q,
    sort: params.sort,
    order: params.order,
    limit: resolvedLimit,
    cursor: params.cursor,
    nextCursor: queried.nextCursor,
    cache: params.noStore ? "no-store" : "miss",
    data: queried.data,
    total: queried.total,
    warnings: uniqueWarnings(
      provider.warnings,
      accessWarnings,
      params.unsupported_market ? ["unsupported_market_forced_crypto"] : [],
    ),
    error: null,
  });

  if (!params.noStore) {
    setAssetsCache(cacheKey, response);
  }

  return response;
}
