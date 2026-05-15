/* ============================================================================
 * FILE: lib/xyvala/access/access-resolver.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - resolve the effective access scope for a validated authenticated request
 * - consume the canonical auth contract without rebuilding keyType or plan
 * - keep Xyvala access governance deterministic, auditable and minimal
 *
 * PARENTS
 * - lib/xyvala/auth.ts
 * - lib/xyvala/access/access-compartments.ts
 * - lib/xyvala/access/access-types.ts
 *
 * DIRECTIVES
 * - consume ApiAuthSuccess only
 * - do not reconstruct auth variables locally
 * - do not infer plan or keyType in this file
 * - preserve deterministic access resolution
 * - keep mapping explicit and auditable
 *
 * INPUTS
 * - auth: ApiAuthSuccess
 *
 * OUTPUTS
 * - AccessScope
 *
 * INVARIANTS
 * - same auth input => same access scope output
 * - public_demo keyType always resolves to public_10
 * - demo plan resolves to demo_30 unless public_demo rule already matched
 * - trader plan resolves to trader_60
 * - pro / enterprise / internal resolve to full_100
 * - no partial or ambiguous output
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/auth.ts
 * - lib/xyvala/access/access-compartments.ts
 * - lib/xyvala/access/access-types.ts
 *
 * SENSITIVE ZONES
 * - auth contract naming
 * - access compartment mapping
 * - priority order between keyType and plan
 * ========================================================================== */

import type { ApiAuthSuccess } from "@/lib/xyvala/auth";
import { ACCESS_COMPARTMENTS } from "./access-compartments";
import type { AccessScope } from "./access-types";

/* ============================================================================
 * 1. ACCESS RESOLUTION
 * ----------------------------------------------------------------------------
 * PRIORITY
 * 1. keyType-level restriction
 * 2. plan-level entitlement
 *
 * NOTES
 * - public_demo is intentionally handled first because it is a harder cap
 * - this file must only consume validated auth outputs from auth.ts
 * ========================================================================== */

export function resolveAccessScope(auth: ApiAuthSuccess): AccessScope {
  if (auth.keyType === "public_demo") {
    return ACCESS_COMPARTMENTS.public_10;
  }

  if (auth.plan === "demo") {
    return ACCESS_COMPARTMENTS.demo_30;
  }

  if (auth.plan === "trader") {
    return ACCESS_COMPARTMENTS.trader_60;
  }

  if (
    auth.plan === "pro" ||
    auth.plan === "enterprise" ||
    auth.plan === "internal"
  ) {
    return ACCESS_COMPARTMENTS.full_100;
  }

  return ACCESS_COMPARTMENTS.public_10;
}
