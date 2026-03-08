// lib/xyvala/registry.ts

/**
 * XYVALA — API Key Registry (V2 robuste)
 *
 * Objectifs :
 * - centraliser les clés API
 * - fusionner base statique + état persistant
 * - permettre add / enable / disable
 * - préparer la transition future vers KV / DB
 *
 * ADN :
 * - simple
 * - robuste
 * - lisible
 * - compatible avec keys.ts, auth.ts et les routes admin
 */

import { API_KEYS, type XyvalaKeyConfig } from "@/lib/xyvala/keys";
import {
  readRegistryFile,
  upsertRegistryFileKey,
  removeRegistryFileKey,
} from "@/lib/xyvala/registry-store";

export type RegistryKeyConfig = XyvalaKeyConfig & {
  createdAt?: string;
};

const runtimeRegistry = new Map<string, RegistryKeyConfig>();

/* ------------------------------ Bootstrapping ----------------------------- */

/**
 * Charge le registre une seule fois :
 * 1) base statique depuis keys.ts
 * 2) surcharge persistante depuis registry-store.ts
 *
 * Règle :
 * le persistant écrase le statique si la clé existe déjà.
 */
function ensureRegistryBootstrapped() {
  if (runtimeRegistry.size > 0) return;

  // Base statique
  for (const [key, value] of Object.entries(API_KEYS)) {
    runtimeRegistry.set(key, {
      ...value,
      enabled: value.enabled !== false,
    });
  }

  // Surcharge persistante
  const persisted = readRegistryFile();

  for (const [key, value] of Object.entries(persisted.keys)) {
    runtimeRegistry.set(key, {
      ...value,
      enabled: value.enabled !== false,
    });
  }
}

/* --------------------------------- Utils --------------------------------- */

function normalizeKey(input: string) {
  return input.trim();
}

function normalizeConfig(input: RegistryKeyConfig): RegistryKeyConfig {
  return {
    ...input,
    enabled: input.enabled !== false,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

/* --------------------------------- Reads --------------------------------- */

export function listRegistryKeys(): Array<{
  key: string;
  config: RegistryKeyConfig;
}> {
  ensureRegistryBootstrapped();

  return Array.from(runtimeRegistry.entries())
    .map(([key, config]) => ({
      key,
      config,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function getRegistryKey(key: string): RegistryKeyConfig | null {
  ensureRegistryBootstrapped();

  const normalized = normalizeKey(key);
  const config = runtimeRegistry.get(normalized);

  return config ?? null;
}

export function hasRegistryKey(key: string): boolean {
  ensureRegistryBootstrapped();
  return runtimeRegistry.has(normalizeKey(key));
}

/* -------------------------------- Writes --------------------------------- */

export function addRegistryKey(input: {
  key: string;
  config: RegistryKeyConfig;
}): {
  ok: boolean;
  created: boolean;
  reason: "created" | "already_exists" | "invalid_key";
} {
  ensureRegistryBootstrapped();

  const key = normalizeKey(input.key);

  if (!key) {
    return {
      ok: false,
      created: false,
      reason: "invalid_key",
    };
  }

  if (runtimeRegistry.has(key)) {
    return {
      ok: false,
      created: false,
      reason: "already_exists",
    };
  }

  const config = normalizeConfig(input.config);

  runtimeRegistry.set(key, config);
  upsertRegistryFileKey(key, config);

  return {
    ok: true,
    created: true,
    reason: "created",
  };
}

export function disableRegistryKey(key: string): {
  ok: boolean;
  updated: boolean;
} {
  ensureRegistryBootstrapped();

  const normalized = normalizeKey(key);
  const current = runtimeRegistry.get(normalized);

  if (!current) {
    return {
      ok: false,
      updated: false,
    };
  }

  const next: RegistryKeyConfig = {
    ...current,
    enabled: false,
  };

  runtimeRegistry.set(normalized, next);
  upsertRegistryFileKey(normalized, next);

  return {
    ok: true,
    updated: true,
  };
}

export function enableRegistryKey(key: string): {
  ok: boolean;
  updated: boolean;
} {
  ensureRegistryBootstrapped();

  const normalized = normalizeKey(key);
  const current = runtimeRegistry.get(normalized);

  if (!current) {
    return {
      ok: false,
      updated: false,
    };
  }

  const next: RegistryKeyConfig = {
    ...current,
    enabled: true,
  };

  runtimeRegistry.set(normalized, next);
  upsertRegistryFileKey(normalized, next);

  return {
    ok: true,
    updated: true,
  };
}

/**
 * Suppression optionnelle.
 * Pas forcément exposée publiquement tout de suite,
 * mais utile pour maintenance / rotation / debug.
 */
export function removeRegistryKey(key: string): {
  ok: boolean;
  removed: boolean;
} {
  ensureRegistryBootstrapped();

  const normalized = normalizeKey(key);

  if (!runtimeRegistry.has(normalized)) {
    return {
      ok: false,
      removed: false,
    };
  }

  runtimeRegistry.delete(normalized);
  removeRegistryFileKey(normalized);

  return {
    ok: true,
    removed: true,
  };
}

/* ---------------------------- Maintenance hooks --------------------------- */

/**
 * Force un rechargement complet depuis :
 * - keys.ts
 * - registry-store.ts
 *
 * Utile pour debug / admin avancé / futur hot-reload du registre.
 */
export function reloadRegistry() {
  runtimeRegistry.clear();
  ensureRegistryBootstrapped();
}

/* ------------------------------- Debug helper ----------------------------- */

export function __registryStats() {
  ensureRegistryBootstrapped();

  const keys = Array.from(runtimeRegistry.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  return {
    totalKeys: keys.length,
    keys,
  };
}
