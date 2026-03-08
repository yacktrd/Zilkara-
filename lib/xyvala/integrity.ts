
import crypto from "crypto"

export type SnapshotIntegrity = {
  hash: string
  prev_hash: string | null
  signature: string
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export function computeSnapshotHash(payload: unknown, prevHash: string | null) {

  const payloadString = JSON.stringify(payload)

  const base = payloadString + (prevHash ?? "")

  return sha256(base)
}

export function signHash(hash: string, secret: string) {

  return crypto
    .createHmac("sha256", secret)
    .update(hash)
    .digest("hex")

}

export function createIntegrityRecord(
  payload: unknown,
  prevHash: string | null,
  secret: string
): SnapshotIntegrity {

  const hash = computeSnapshotHash(payload, prevHash)

  const signature = signHash(hash, secret)

  return {
    hash,
    prev_hash: prevHash,
    signature
  }
}
