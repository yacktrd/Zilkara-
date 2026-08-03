// lib/xyvala/governance/lineage-reconciliation/lineage-types.ts

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

import type {
  VariableLineageEntry,
  VariableOwnerLayer,
} from "@/lib/xyvala/governance/variable-lineage-registry";

export type LineageReconciliationStatus =
  | "OK"
  | "DEGRADED"
  | "BLOCKED";

export type LineageApplicability =
  | "REQUIRED"
  | "OPTIONAL"
  | "NOT_APPLICABLE";

export type LineageGovernanceScope = {
  scope_name: string;
  executed_layers: readonly VariableOwnerLayer[];
  required_variables: readonly string[];
  optional_variables: readonly string[];
  strict_required_variables: boolean;
};

export type ReconcileLineageInput = {
  traces?: readonly RuntimeTraceInput[];
  registry?: readonly VariableLineageEntry[];
  scope?: LineageGovernanceScope;
  executed_layers?: readonly VariableOwnerLayer[];
  required_variables?: readonly string[];
  optional_variables?: readonly string[];
};
