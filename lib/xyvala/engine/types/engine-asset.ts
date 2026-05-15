/* ============================================================================
 * FILE: lib/xyvala/engine/types/engine-asset.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala internal engine asset contract
 *
 * ROLE
 * - define the internal asset shape used by decision engines
 * - separate private analytical fields from public ScanAsset
 *
 * DIRECTIVES
 * - internal engine contract only
 * - no public API exposure
 * - no UI exposure
 * - no broker / affiliation fields
 * - no fallback guessing
 * - number means confirmed computed value
 * ========================================================================== */

export type EngineRegime = "STABLE" | "TRANSITION" | "VOLATILE";

export type EngineDecision = "ALLOW" | "WATCH" | "BLOCK";

export type EngineAsset = {
  id: string;
  symbol: string;
  name: string;

  stability_score: number;
  opportunity_score: number;
  confidence_score: number;
  convergence_score: number;

  rupture_score: number;
  rupture_probability: number;
  continuity_probability: number;

  regime: EngineRegime;
  decision: EngineDecision;
};
