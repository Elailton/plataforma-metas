import assert from "node:assert/strict"
import test from "node:test"
import { releaseRefreshDelay, RELEASE_REFRESH_SPREAD_MS, RELEASE_REFRESH_MIN_MS } from "../lib/goals/release-refresh.mjs"

test("recarga da liberação fica espalhada numa janela, nunca antes da hora", () => {
  const releaseAt = 1_000_000
  const delays = [0, 0.25, 0.5, 0.999].map((j) => releaseRefreshDelay(releaseAt, releaseAt - 5_000, j))
  assert.equal(delays[0], 5_000 + RELEASE_REFRESH_MIN_MS)
  assert.ok(delays.every((d) => d >= 5_000 + RELEASE_REFRESH_MIN_MS))
  assert.ok(delays.every((d) => d <= 5_000 + RELEASE_REFRESH_MIN_MS + RELEASE_REFRESH_SPREAD_MS))
  assert.equal(new Set(delays).size, 4)
})

test("liberação já passou há muito tempo: recarrega imediatamente; jitter inválido vira 0", () => {
  assert.equal(releaseRefreshDelay(0, 10 * RELEASE_REFRESH_SPREAD_MS, 0.5), 0)
  assert.equal(releaseRefreshDelay(100, 100, Number.NaN), RELEASE_REFRESH_MIN_MS)
  assert.ok(releaseRefreshDelay(100, 100, 7) < RELEASE_REFRESH_MIN_MS + RELEASE_REFRESH_SPREAD_MS)
})
