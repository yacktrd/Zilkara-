// lib/xyvala/keys.ts

/**
 * XYVALA — API Keys Registry (V1 robuste)
 *
 * Objectifs :
 * - centraliser les clés API locales
 * - associer un plan à chaque clé
 * - préparer l'évolution vers une source distante (KV / DB)
 *
 * ADN :
 * - simple
 * - lisible
 * - robuste
 * - compatible avec auth.ts
 */

export type XyvalaKeyPlan = "free" | "trader" | "pro" | "enterprise";

export type XyvalaKeyConfig = {
  plan: XyvalaKeyPlan;
  enabled?: boolean;

  /**
   * Réservé pour évolutions futures
   * - label client
   * - date d’expiration
   * - notes internes
   */
  label?: string;
};

export const API_KEYS: Record<string, XyvalaKeyConfig> = {
  xyvala_test_key: {
    plan: "trader",
    enabled: true,
    label: "local test",
  },

  xyvala_pro_key: {
    plan: "pro",
    enabled: true,
    label: "local pro",
  },

  xyvala_enterprise_key: {
    plan: "enterprise",
    enabled: true,
    label: "local enterprise",
  },
};
