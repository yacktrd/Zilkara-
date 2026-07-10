/* ============================================================================
 * FILE: lib/xyvala/runtime/administration/enterprise-runtime-administration.ts
 * ============================================================================
 * TITLE
 * - Xyvala enterprise runtime administration
 *
 * ROLE
 * - centralize enterprise runtime administration actions
 * - expose controlled operational administration contracts
 * - coordinate supervision, orchestration, policies and cluster commands
 *
 * PARENTS
 * - lib/xyvala/runtime/supervision/runtime-supervision-core.ts
 * - lib/xyvala/runtime/orchestration/runtime-orchestration-core.ts
 * - lib/xyvala/runtime/commands/cluster-command-gateway.ts
 * - lib/xyvala/runtime/policies/production-runtime-policy-engine.ts
 *
 * DIRECTIVES
 * - runtime administration only
 * - no UI logic
 * - no route response building
 * - no business mutation
 * - no billing mutation
 * - no account mutation
 * - no API key mutation
 * - no quota decision mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - controlled operational coordination only
 *
 * INVARIANTS
 * - administration actions require runtime policy validation
 * - blocked runtime state prevents mutation actions
 * - read-only administration remains available when safe
 * - every administration action emits a runtime event
 * - no raw secrets are exposed through administration payloads
 * ========================================================================== */

import {
  buildRuntimeSupervisionCore,
  type RuntimeSupervisionSnapshot,
} from "@/lib/xyvala/runtime/supervision/runtime-supervision-core";

import {
  buildRuntimeOrchestrationCore,
  type RuntimeOrchestrationSnapshot,
} from "@/lib/xyvala/runtime/orchestration/runtime-orchestration-core";

import {
  executeClusterCommand,
  type ClusterCommandInput,
  type ClusterCommandResult,
} from "@/lib/xyvala/runtime/commands/cluster-command-gateway";

import {
  evaluateProductionRuntimePolicy,
  type RuntimeMutationScope,
  type RuntimePolicyEvaluation,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type EnterpriseRuntimeAdministrationAction =
  | "read_status"
  | "read_supervision"
  | "read_orchestration"
  | "execute_cluster_command";

export type EnterpriseRuntimeAdministrationStatus =
  | "accepted"
  | "blocked"
  | "failed";

export type EnterpriseRuntimeAdministrationInput = {
  action: EnterpriseRuntimeAdministrationAction;
  scope?: RuntimeMutationScope;
  request_id?: string | null;
  command?: ClusterCommandInput | null;
};

export type EnterpriseRuntimeAdministrationResult = {
  ok: boolean;
  status: EnterpriseRuntimeAdministrationStatus;

  action: EnterpriseRuntimeAdministrationAction;
  executed_at: string;

  scope: RuntimeMutationScope;

  policy: RuntimePolicyEvaluation;
  supervision: RuntimeSupervisionSnapshot | null;
  orchestration: RuntimeOrchestrationSnapshot | null;
  command_result: ClusterCommandResult | null;

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
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

function resolveScope(
  action: EnterpriseRuntimeAdministrationAction,
  scope?: RuntimeMutationScope,
): RuntimeMutationScope {
  if (scope) return scope;

  if (
    action === "read_status" ||
    action === "read_supervision" ||
    action === "read_orchestration"
  ) {
    return "read";
  }

  return "admin";
}

function isReadAction(action: EnterpriseRuntimeAdministrationAction): boolean {
  return (
    action === "read_status" ||
    action === "read_supervision" ||
    action === "read_orchestration"
  );
}

function blockedResult(input: {
  action: EnterpriseRuntimeAdministrationAction;
  scope: RuntimeMutationScope;
  policy: RuntimePolicyEvaluation;
  warnings: string[];
  error: string;
}): EnterpriseRuntimeAdministrationResult {
  return {
    ok: false,
    status: "blocked",

    action: input.action,
    executed_at: nowIso(),

    scope: input.scope,

    policy: input.policy,
    supervision: null,
    orchestration: null,
    command_result: null,

    warnings: input.warnings,
    error: input.error,
  };
}

/* ============================================================================
 * 3. ADMINISTRATION
 * ========================================================================== */

export async function executeEnterpriseRuntimeAdministration(
  input: EnterpriseRuntimeAdministrationInput,
): Promise<EnterpriseRuntimeAdministrationResult> {
  const executedAt = nowIso();
  const scope = resolveScope(input.action, input.scope);

  const policy = await evaluateProductionRuntimePolicy({
    scope,
  });

  if (policy.decision === "BLOCK") {
    return blockedResult({
      action: input.action,
      scope,
      policy,
      warnings: uniqueWarnings(policy.warnings, [
        "enterprise_runtime_administration_blocked",
      ]),
      error: "enterprise_runtime_administration_blocked",
    });
  }

  if (!isReadAction(input.action) && policy.decision === "PROTECT") {
    return blockedResult({
      action: input.action,
      scope,
      policy,
      warnings: uniqueWarnings(policy.warnings, [
        "enterprise_runtime_administration_protected_mode",
      ]),
      error: "enterprise_runtime_administration_protected_mode",
    });
  }

  let supervision: RuntimeSupervisionSnapshot | null = null;
  let orchestration: RuntimeOrchestrationSnapshot | null = null;
  let commandResult: ClusterCommandResult | null = null;

  try {
    if (input.action === "read_status") {
      supervision = await buildRuntimeSupervisionCore({
        scope,
      });

      orchestration = await buildRuntimeOrchestrationCore({
        scope,
      });
    }

    if (input.action === "read_supervision") {
      supervision = await buildRuntimeSupervisionCore({
        scope,
      });
    }

    if (input.action === "read_orchestration") {
      orchestration = await buildRuntimeOrchestrationCore({
        scope,
      });
    }

    if (input.action === "execute_cluster_command") {
      if (!input.command) {
        throw new Error("enterprise_runtime_command_missing");
      }

      commandResult = await executeClusterCommand({
        ...input.command,
        request_id: input.request_id ?? input.command.request_id ?? null,
      });
    }

    await publishRuntimeEvent({
      kind: "runtime_job_requested",
      priority:
        policy.decision === "WATCH"
          ? "high"
          : "normal",
      request_id: input.request_id ?? null,
      payload: {
        enterprise_runtime_action: input.action,
        scope,
        policy_decision: policy.decision,
        supervision_state: supervision?.state ?? null,
        orchestration_state: orchestration?.state ?? null,
        command_status: commandResult?.status ?? null,
      },
      warnings:
        policy.decision === "ALLOW"
          ? ["enterprise_runtime_administration_executed"]
          : ["enterprise_runtime_administration_executed_with_policy_warning"],
    });

    return {
      ok: commandResult ? commandResult.ok : true,
      status: commandResult && !commandResult.ok ? "failed" : "accepted",

      action: input.action,
      executed_at: executedAt,

      scope,

      policy,
      supervision,
      orchestration,
      command_result: commandResult,

      warnings: uniqueWarnings(
        policy.warnings,
        supervision?.warnings,
        orchestration?.warnings,
        commandResult?.warnings,
      ),
      error: commandResult?.error ?? null,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "enterprise_runtime_administration_failed";

    return {
      ok: false,
      status: "failed",

      action: input.action,
      executed_at: executedAt,

      scope,

      policy,
      supervision,
      orchestration,
      command_result: commandResult,

      warnings: uniqueWarnings(policy.warnings, [
        "enterprise_runtime_administration_failed",
      ]),
      error: message,
    };
  }
}

/* ============================================================================
 * 4. CONVENIENCE READERS
 * ========================================================================== */

export async function readEnterpriseRuntimeStatus(): Promise<EnterpriseRuntimeAdministrationResult> {
  return executeEnterpriseRuntimeAdministration({
    action: "read_status",
  });
}

export async function executeEnterpriseClusterCommand(
  command: ClusterCommandInput,
): Promise<EnterpriseRuntimeAdministrationResult> {
  return executeEnterpriseRuntimeAdministration({
    action: "execute_cluster_command",
    command,
  });
}
