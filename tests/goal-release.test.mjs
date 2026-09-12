import assert from "node:assert/strict"
import test from "node:test"
import { isGoalReleased, releaseInstant } from "../lib/goals/release.mjs"

test("goal without release date is immediately available", () => {
  assert.equal(isGoalReleased(null, new Date("2026-09-12T12:00:00Z")), true)
})

test("past and current Fortaleza dates are available", () => {
  const now = new Date("2026-09-12T03:00:00Z")
  assert.equal(isGoalReleased("2026-09-11", now), true)
  assert.equal(isGoalReleased("2026-09-12", now), true)
})

test("future Fortaleza date remains locked", () => {
  assert.equal(isGoalReleased("2026-09-13", new Date("2026-09-12T23:59:59-03:00")), false)
})

test("release starts at midnight in Fortaleza", () => {
  assert.equal(releaseInstant("2026-09-15").toISOString(), "2026-09-15T03:00:00.000Z")
})
