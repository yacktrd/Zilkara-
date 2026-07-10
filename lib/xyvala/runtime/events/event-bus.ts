/* ============================================================================
 * FILE: lib/xyvala/runtime/events/event-bus.ts
 * ============================================================================
 * TITLE
 * - Runtime event bus
 *
 * ROLE
 * - define runtime event contracts
 * - create explicit runtime events
 * - store runtime events in controlled memory
 * - dispatch only to explicitly subscribed handlers
 * - expose pure event readers
 *
 * DIRECTIVES
 * - MUTATE layer only for publish / subscribe / clear
 * - OBSERVE layer only for readers
 * - no background job enqueue
 * - no audit log creation
 * - no failover trigger
 * - no recovery trigger
 * - no queue write
 * - no runtime orchestration
 * - no business mutation
 * - no billing mutation
 * - no account mutation
 * - no API key mutation
 * - no quota mutation
 *
 * INPUTS
 * - runtime event kind
 * - runtime priority
 * - contextual ids
 * - sanitized payload
 * - explicit handler subscription
 *
 * OUTPUTS
 * - RuntimeEvent
 * - PublishRuntimeEventResult
 * - RuntimeEvent readers
 *
 * INVARIANTS
 * - event publishing is explicit mutation
 * - event readers never mutate
 * - event bus never decides orchestration
 * - event bus never enqueues jobs automatically
 * - event bus never writes audit logs automatically
 * - handlers are explicitly subscribed
 * - handlers receive cloned immutable event data
 *
 * CRITICAL DEPENDENCIES
 * - none
 *
 * SENSITIVE ZONES
 * - in-memory event store
 * - handler execution
 * - store clearing
 * ========================================================================== */

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeEventKind =
  | "account_created"
  | "session_created"
  | "api_key_created"
  | "api_key_used"
  | "quota_evaluated"
  | "billing_subscription_updated"
  | "billing_invoice_updated"
  | "organization_created"
  | "organization_member_updated"
  | "audit_recorded"
  | "monitoring_alert_generated"
  | "runtime_job_requested";

export type RuntimeEventPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export type RuntimeEventPayload = Record<
  string,
  string | number | boolean | null
>;

export type RuntimeEvent = {
  id: string;
  kind: RuntimeEventKind;
  priority: RuntimeEventPriority;

  account_id: string | null;
  organization_id: string | null;
  request_id: string | null;

  payload: RuntimeEventPayload;

  created_at: string;
  warnings: string[];
};

export type RuntimeEventHandler = (
  event: RuntimeEvent,
) => void | Promise<void>;

export type PublishRuntimeEventResult = {
  ok: boolean;
  event: RuntimeEvent;
  handled: number;
  warnings: string[];
  error: string | null;
};

export type RuntimeEventSubscriptionResult = {
  ok: boolean;
  kind: RuntimeEventKind;
  subscribed_at: string;
  unsubscribe: () => void;
  warnings: string[];
  error: string | null;
};

export type RuntimeEventStoreSnapshot = {
  ok: boolean;
  generated_at: string;
  total_events: number;
  total_handler_groups: number;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. STORE
 * ========================================================================== */

type EventBusStore = {
  events: Map<string, RuntimeEvent>;
  handlers: Map<RuntimeEventKind, Set<RuntimeEventHandler>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_EVENT_BUS_STORE__: EventBusStore | undefined;
}

function getStore(): EventBusStore {
  if (!globalThis.__XYVALA_EVENT_BUS_STORE__) {
    globalThis.__XYVALA_EVENT_BUS_STORE__ = {
      events: new Map(),
      handlers: new Map(),
    };
  }

  return globalThis.__XYVALA_EVENT_BUS_STORE__;
}

/* ============================================================================
 * 3. HELPERS — PURE
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function buildEventId(kind: RuntimeEventKind): string {
  return `event_${kind}_${Date.now().toString(36)}`;
}

function safeString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
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

function sanitizePayload(
  payload: RuntimeEventPayload | undefined,
): RuntimeEventPayload {
  const output: RuntimeEventPayload = {};

  if (!payload || typeof payload !== "object") {
    return output;
  }

  for (const [key, value] of Object.entries(payload)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      output[key] = value;
    }
  }

  return output;
}

function cloneEvent(event: RuntimeEvent): RuntimeEvent {
  return {
    ...event,
    payload: { ...event.payload },
    warnings: [...event.warnings],
  };
}

function buildRuntimeEvent(input: {
  kind: RuntimeEventKind;
  priority?: RuntimeEventPriority;
  account_id?: string | null;
  organization_id?: string | null;
  request_id?: string | null;
  payload?: RuntimeEventPayload;
  warnings?: string[];
}): RuntimeEvent {
  return {
    id: buildEventId(input.kind),
    kind: input.kind,
    priority: input.priority ?? "normal",

    account_id: safeString(input.account_id) ?? null,
    organization_id: safeString(input.organization_id) ?? null,
    request_id: safeString(input.request_id) ?? null,

    payload: sanitizePayload(input.payload),

    created_at: nowIso(),
    warnings: uniqueWarnings(input.warnings),
  };
}

/* ============================================================================
 * 4. MUTATE — SUBSCRIPTIONS
 * ========================================================================== */

export function subscribeRuntimeEvent(
  kind: RuntimeEventKind,
  handler: RuntimeEventHandler,
): RuntimeEventSubscriptionResult {
  const subscribedAt = nowIso();

  if (typeof handler !== "function") {
    return {
      ok: false,
      kind,
      subscribed_at: subscribedAt,
      unsubscribe: () => undefined,
      warnings: ["runtime_event_handler_invalid"],
      error: "runtime_event_handler_invalid",
    };
  }

  const store = getStore();
  const handlers = store.handlers.get(kind) ?? new Set<RuntimeEventHandler>();

  handlers.add(handler);
  store.handlers.set(kind, handlers);

  return {
    ok: true,
    kind,
    subscribed_at: subscribedAt,
    unsubscribe: () => {
      const currentHandlers =
        store.handlers.get(kind) ?? new Set<RuntimeEventHandler>();

      currentHandlers.delete(handler);

      if (currentHandlers.size === 0) {
        store.handlers.delete(kind);
      } else {
        store.handlers.set(kind, currentHandlers);
      }
    },
    warnings: [],
    error: null,
  };
}

/* ============================================================================
 * 5. MUTATE — EVENT PUBLISHING
 * ========================================================================== */

export async function publishRuntimeEvent(input: {
  kind: RuntimeEventKind;
  priority?: RuntimeEventPriority;
  account_id?: string | null;
  organization_id?: string | null;
  request_id?: string | null;
  payload?: RuntimeEventPayload;
  warnings?: string[];
}): Promise<PublishRuntimeEventResult> {
  const event = buildRuntimeEvent(input);
  const store = getStore();

  store.events.set(event.id, cloneEvent(event));

  const handlers = [...(store.handlers.get(event.kind) ?? [])];

  let handled = 0;
  const handlerWarnings: string[] = [];

  for (const handler of handlers) {
    try {
      await handler(cloneEvent(event));
      handled += 1;
    } catch (error) {
      handlerWarnings.push(
        error instanceof Error && error.message
          ? `runtime_event_handler_failed:${error.message}`
          : "runtime_event_handler_failed",
      );
    }
  }

  const warnings = uniqueWarnings(event.warnings, handlerWarnings);

  return {
    ok: handlerWarnings.length === 0,
    event: cloneEvent(event),
    handled,
    warnings,
    error:
      handlerWarnings.length > 0
        ? "runtime_event_handler_failed"
        : null,
  };
}

/* ============================================================================
 * 6. OBSERVE — READERS
 * ========================================================================== */

export function findRuntimeEventById(id: string): RuntimeEvent | null {
  const eventId = safeString(id);

  if (!eventId) return null;

  const event = getStore().events.get(eventId);

  return event ? cloneEvent(event) : null;
}

export function listRuntimeEvents(): RuntimeEvent[] {
  return [...getStore().events.values()].map(cloneEvent);
}

export function listRuntimeEventsByKind(
  kind: RuntimeEventKind,
): RuntimeEvent[] {
  return listRuntimeEvents().filter((event) => event.kind === kind);
}

export function buildRuntimeEventStoreSnapshot(): RuntimeEventStoreSnapshot {
  const store = getStore();

  return {
    ok: true,
    generated_at: nowIso(),
    total_events: store.events.size,
    total_handler_groups: store.handlers.size,
    warnings: [],
    error: null,
  };
}

/* ============================================================================
 * 7. MUTATE — MAINTENANCE
 * ========================================================================== */

export function clearEventBusStore(): void {
  const store = getStore();

  store.events.clear();
  store.handlers.clear();
}
