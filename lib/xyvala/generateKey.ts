// lib/xyvala/generateKey.ts

/**
 * XYVALA — API Key Generator
 *
 * Objectifs :
 * - générer des clés uniques
 * - format stable
 * - sécurité cryptographique
 * - compatible avec registry.ts
 */

import crypto from "crypto"

export type XyvalaKeyType =
  | "test"
  | "live"

function randomPart(bytes = 8) {
  return crypto.randomBytes(bytes).toString("hex")
}

export function generateApiKey(type: XyvalaKeyType = "live") {

  const part = randomPart(8)

  return `xyvala_${type}_${part}`

}
