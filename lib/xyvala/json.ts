// lib/xyvala/json.ts

/**
 * XYVALA — JSON Core Contracts
 *
 * Rôle :
 * - fournir une base de typage JSON stricte et réutilisable
 * - éviter les dérives `unknown[]`, `Record<string, unknown>` et autres formes trop lâches
 * - stabiliser les contrats entre routes, client interne, cache et normalisation
 *
 * Ce fichier doit rester :
 * - petit
 * - stable
 * - sans dépendance métier
 */

export type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRecord = {
  [key: string]: JsonValue;
};

/**
 * Vérifie qu'une valeur est un objet JSON simple
 * (non null, non tableau).
 */
export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Vérifie qu'une valeur est un tableau JSON.
 */
export function isJsonArray(value: unknown): value is JsonValue[] {
  return Array.isArray(value);
}

/**
 * Vérifie qu'une valeur est une primitive JSON.
 */
export function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * Vérifie récursivement si une valeur est JSON-compatible.
 *
 * Usage :
 * - validation défensive légère
 * - sécurisation des réponses ou payloads dynamiques
 *
 * Note :
 * - les objets Date, Map, Set, fonctions, bigint, undefined ne passent pas
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (isJsonPrimitive(value)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isJsonRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}

/**
 * Convertit une valeur en string propre si possible.
 */
export function safeJsonString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

/**
 * Convertit une valeur en nombre fini ou null.
 */
export function safeJsonNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Convertit une valeur en booléen ou null.
 */
export function safeJsonBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/**
 * Lit une clé d'un objet JSON et retourne null si absent/invalide.
 */
export function getJsonValue(
  record: JsonRecord | null | undefined,
  key: string
): JsonValue | null {
  if (!record) return null;
  if (!(key in record)) return null;

  const value = record[key];
  return typeof value === "undefined" ? null : value;
}

/**
 * Lit une chaîne depuis un JsonRecord.
 */
export function getJsonString(
  record: JsonRecord | null | undefined,
  key: string
): string | null {
  const value = getJsonValue(record, key);
  return typeof value === "string" ? value : null;
}

/**
 * Lit un nombre depuis un JsonRecord.
 */
export function getJsonNumber(
  record: JsonRecord | null | undefined,
  key: string
): number | null {
  const value = getJsonValue(record, key);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Lit un booléen depuis un JsonRecord.
 */
export function getJsonBoolean(
  record: JsonRecord | null | undefined,
  key: string
): boolean | null {
  const value = getJsonValue(record, key);
  return typeof value === "boolean" ? value : null;
}

/**
 * Lit un objet JSON depuis un JsonRecord.
 */
export function getJsonRecord(
  record: JsonRecord | null | undefined,
  key: string
): JsonRecord | null {
  const value = getJsonValue(record, key);
  return isJsonRecord(value) ? value : null;
}

/**
 * Lit un tableau JSON depuis un JsonRecord.
 */
export function getJsonArray(
  record: JsonRecord | null | undefined,
  key: string
): JsonValue[] | null {
  const value = getJsonValue(record, key);
  return Array.isArray(value) ? value : null;
}
