/* ============================================================================
 * FILE: lib/xyvala/runtime/cluster/cluster-orchestrator.ts
 * ============================================================================
 * TITLE
 * - Runtime cluster orchestrator
 *
 * ROLE
 * - read runtime cluster state
 * - register explicit runtime node participation
 * - update explicit node heartbeats
 * - unregister explicit runtime nodes
 * - expose deterministic cluster snapshots
 *
 * PARENTS
 * - lib/xyvala/runtime/redis/redis-adapter.ts
 *
 * DIRECTIVES
 * - cluster coordination only
 * - read functions must not mutate
 * - write functions must be explicit
 * - no event publishing
 * - no failover trigger
 * - no recovery trigger
 * - no queue writes
 * - no business mutation
 * - no billing mutation
 * - no account mutation
 * - no API key mutation
 * - no quota decision mutation
 * - no RFS recomputation
 * - no MCI recomputation
 *
 * INPUTS
 * - node identifier
 * - node capabilities
 * - heartbeat ttl
 * - Redis persisted cluster state
 *
 * OUTPUTS
 * - ClusterOperationResult<ClusterState>
 * - leader id
 * - leadership boolean
 *
 * INVARIANTS
 * - every node heartbeat is explicit
 * - inactive nodes are ignored for leadership
 * - leader election is deterministic
 * - Redis failures degrade safely
 * - readers never write
 * - mutations only happen in register/heartbeat/unregister functions
 *
 * CRITICAL DEPENDENCIES
 * - redisGet
 * - redisSet
 *
 * SENSITIVE ZONES
 * - Redis writes
 * - leader election
 * - heartbeat status resolution
 * - unregister node mutation
 * ========================================================================== */

import {
  redisGet,
  redisSet,
} from "@/lib/xyvala/runtime/redis/redis-adapter";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ClusterNodeStatus = "active" | "stale" | "offline";

export type ClusterRole = "leader" | "worker" | "standby";

export type ClusterNode = {
  id: string;
  role: ClusterRole;
  status: ClusterNodeStatus;

  started_at: string;
  last_heartbeat_at: string;

  heartbeat_ttl_ms: number;

  capabilities: string[];

  warnings: string[];
};

export type ClusterState = {
  leader_id: string | null;
  nodes: ClusterNode[];

  active_nodes: number;
  stale_nodes: number;
  offline_nodes: number;

  updated_at: string;

  warnings: string[];
};

export type ClusterOperationResult<T> = {
  ok: boolean;
  data: T | null;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const CLUSTER_KEY = "xyvala:cluster:state";
const DEFAULT_HEARTBEAT_TTL_MS = 30_000;
const CLUSTER_STATE_TTL_SECONDS = 120;

/* ============================================================================
 * 3. HELPERS — PURE
 * ========================================================================== */

function nowMs(): number {
  return Date.now();
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function normalizeCapabilities(value: string[]): string[] {
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeHeartbeatTtlMs(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_HEARTBEAT_TTL_MS;
  }

  return Math.max(5_000, Math.trunc(value));
}

function resolveNodeStatus(node: ClusterNode): ClusterNodeStatus {
  const lastHeartbeat = new Date(node.last_heartbeat_at).getTime();

  if (!Number.isFinite(lastHeartbeat)) return "offline";

  const age = nowMs() - lastHeartbeat;

  if (age <= node.heartbeat_ttl_ms) return "active";
  if (age <= node.heartbeat_ttl_ms * 3) return "stale";

  return "offline";
}

function normalizeNode(node: ClusterNode): ClusterNode {
  const status = resolveNodeStatus(node);

  return {
    ...node,
    status,
    capabilities: normalizeCapabilities(node.capabilities),
    warnings: uniqueWarnings(
      node.warnings,
      status !== "active" ? [`cluster_node_${status}`] : [],
    ),
  };
}

function electLeader(nodes: ClusterNode[]): string | null {
  const activeNodes = nodes
    .filter((node) => node.status === "active")
    .sort((left, right) => left.id.localeCompare(right.id));

  return activeNodes[0]?.id ?? null;
}

function buildEmptyClusterState(): ClusterState {
  return {
    leader_id: null,
    nodes: [],

    active_nodes: 0,
    stale_nodes: 0,
    offline_nodes: 0,

    updated_at: nowIso(),

    warnings: [],
  };
}

function normalizeClusterState(state: ClusterState): ClusterState {
  const normalizedNodes = state.nodes.map(normalizeNode);
  const leaderId = electLeader(normalizedNodes);

  const nodes: ClusterNode[] = normalizedNodes.map((node) => {
  const role: ClusterRole =
    node.status === "active" && node.id === leaderId
      ? "leader"
      : node.status === "active"
        ? "worker"
        : "standby";

  return {
    ...node,
    role,
  };
});

  return {
    leader_id: leaderId,
    nodes,

    active_nodes: nodes.filter((node) => node.status === "active").length,
    stale_nodes: nodes.filter((node) => node.status === "stale").length,
    offline_nodes: nodes.filter((node) => node.status === "offline").length,

    updated_at: nowIso(),

    warnings: uniqueWarnings(
      state.warnings,
      nodes.some((node) => node.status !== "active")
        ? ["cluster_degraded_nodes_detected"]
        : [],
      !leaderId ? ["cluster_leader_missing"] : [],
    ),
  };
}

function buildClusterNode(input: {
  node_id: string;
  existing: ClusterNode | undefined;
  capabilities: string[];
  heartbeat_ttl_ms: number;
  timestamp: string;
}): ClusterNode {
  return {
    id: input.node_id,
    role: input.existing?.role ?? "worker",
    status: "active",

    started_at: input.existing?.started_at ?? input.timestamp,
    last_heartbeat_at: input.timestamp,

    heartbeat_ttl_ms: input.heartbeat_ttl_ms,

    capabilities: normalizeCapabilities(input.capabilities),

    warnings: [],
  };
}

/* ============================================================================
 * 4. INTERNAL IO
 * ========================================================================== */

async function readClusterState(): Promise<ClusterState> {
  const result = await redisGet<ClusterState>(CLUSTER_KEY);

  if (!result.ok || !result.data) {
    return buildEmptyClusterState();
  }

  return normalizeClusterState(result.data);
}

async function writeClusterState(
  state: ClusterState,
): Promise<ClusterOperationResult<ClusterState>> {
  const normalized = normalizeClusterState(state);
  const stored = await redisSet(
    CLUSTER_KEY,
    normalized,
    CLUSTER_STATE_TTL_SECONDS,
  );

  if (!stored.ok) {
    return {
      ok: false,
      data: normalized,
      warnings: uniqueWarnings(stored.warnings, ["cluster_state_store_failed"]),
      error: stored.error ?? "cluster_state_store_failed",
    };
  }

  return {
    ok: true,
    data: normalized,
    warnings: normalized.warnings,
    error: null,
  };
}

/* ============================================================================
 * 5. MUTATIONS — EXPLICIT CLUSTER WRITES
 * ========================================================================== */

export async function registerClusterNode(input: {
  node_id: string;
  capabilities?: string[];
  heartbeat_ttl_ms?: number | null;
}): Promise<ClusterOperationResult<ClusterState>> {
  const nodeId = safeString(input.node_id);

  if (!nodeId) {
    return {
      ok: false,
      data: null,
      warnings: ["cluster_node_id_missing"],
      error: "cluster_node_id_missing",
    };
  }

  const state = await readClusterState();
  const existing = state.nodes.find((node) => node.id === nodeId);
  const timestamp = nowIso();

  const node = buildClusterNode({
    node_id: nodeId,
    existing,
    capabilities: input.capabilities ?? [],
    heartbeat_ttl_ms: normalizeHeartbeatTtlMs(input.heartbeat_ttl_ms),
    timestamp,
  });

  const nextState: ClusterState = {
    ...state,
    nodes: [...state.nodes.filter((item) => item.id !== nodeId), node],
  };

  return writeClusterState(nextState);
}

export async function heartbeatClusterNode(input: {
  node_id: string;
}): Promise<ClusterOperationResult<ClusterState>> {
  const nodeId = safeString(input.node_id);

  if (!nodeId) {
    return {
      ok: false,
      data: null,
      warnings: ["cluster_node_id_missing"],
      error: "cluster_node_id_missing",
    };
  }

  const state = await readClusterState();
  const existing = state.nodes.find((node) => node.id === nodeId);

  if (!existing) {
    return registerClusterNode({
      node_id: nodeId,
    });
  }

  const updated: ClusterNode = {
    ...existing,
    status: "active",
    last_heartbeat_at: nowIso(),
    warnings: uniqueWarnings(existing.warnings),
  };

  const nextState: ClusterState = {
    ...state,
    nodes: [...state.nodes.filter((node) => node.id !== nodeId), updated],
  };

  return writeClusterState(nextState);
}

export async function unregisterClusterNode(input: {
  node_id: string;
}): Promise<ClusterOperationResult<ClusterState>> {
  const nodeId = safeString(input.node_id);

  if (!nodeId) {
    return {
      ok: false,
      data: null,
      warnings: ["cluster_node_id_missing"],
      error: "cluster_node_id_missing",
    };
  }

  const state = await readClusterState();

  const nextState: ClusterState = {
    ...state,
    nodes: state.nodes.filter((node) => node.id !== nodeId),
    warnings: uniqueWarnings(state.warnings, ["cluster_node_unregistered"]),
  };

  return writeClusterState(nextState);
}

/* ============================================================================
 * 6. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getClusterState(): Promise<
  ClusterOperationResult<ClusterState>
> {
  const state = await readClusterState();

  return {
    ok: true,
    data: state,
    warnings: state.warnings,
    error: null,
  };
}

export async function getClusterLeaderId(): Promise<string | null> {
  const state = await readClusterState();

  return state.leader_id;
}

export async function isClusterLeader(nodeId: string): Promise<boolean> {
  const leaderId = await getClusterLeaderId();

  return Boolean(leaderId && leaderId === nodeId);
}
