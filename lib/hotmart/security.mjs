import { createHash, timingSafeEqual } from "node:crypto"

export function hottokMatches(received, expected) {
  if (typeof received !== "string" || !received || typeof expected !== "string" || !expected) {
    return false
  }

  const receivedDigest = createHash("sha256").update(received, "utf8").digest()
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest()
  return timingSafeEqual(receivedDigest, expectedDigest)
}
