import assert from "node:assert/strict"
import test from "node:test"
import {
  summarizeCourseTimelines,
  summarizeGoalTimeline,
  summarizeMaterials,
  summarizeStudents,
} from "../lib/admin/course-overview.mjs"

const goal = (id, title, dueDate, targetGroups = [1, 2], status = "published") => ({
  id, title, dueDate, targetGroups, status, items: [{}, {}],
})

test("última meta liberada é a de maior data até hoje; a próxima é a primeira futura", () => {
  const goals = [
    goal("m0", "Meta 0", null),
    goal("m1", "Meta 01", "2026-11-02"),
    goal("m2", "Meta 02", "2026-11-03"),
    goal("m3", "Meta 03", "2026-11-04"),
    goal("rasc", "Meta 04", "2026-11-03", [1, 2], "draft"),
  ]
  const t = summarizeGoalTimeline(goals, "2026-11-03")
  assert.equal(t.lastReleased.id, "m2")
  assert.equal(t.lastReleased.itemCount, 2)
  assert.equal(t.next.id, "m3")
  assert.equal(t.releasedCount, 3)
  assert.equal(t.scheduledCount, 1)
  assert.equal(t.lastDate, "2026-11-04")
})

test("antes da primeira data só a meta sem data conta como liberada", () => {
  const t = summarizeGoalTimeline([goal("m0", "Meta 0", null), goal("m1", "Meta 01", "2026-11-02")], "2026-10-29")
  assert.equal(t.lastReleased.id, "m0")
  assert.equal(t.next.id, "m1")
})

test("metas separadas por grupo geram uma linha do tempo por grupo", () => {
  const goals = [
    goal("g1a", "Meta 01", "2026-11-02", [1]),
    goal("g2a", "Meta 01", "2026-11-02", [2]),
    goal("g2b", "Meta 02", "2026-11-03", [2]),
    goal("m0", "Meta 0", null, [1, 2, 3]),
  ]
  const [g1, g2] = summarizeCourseTimelines(goals, "2026-11-03")
  assert.equal(g1.group, 1)
  assert.equal(g1.lastReleased.id, "g1a")
  assert.equal(g2.lastReleased.id, "g2b")
})

test("curso sem metas por grupo tem uma única linha do tempo", () => {
  const timelines = summarizeCourseTimelines([goal("a", "Meta 01", "2026-11-02")], "2026-11-02")
  assert.equal(timelines.length, 1)
  assert.equal(timelines[0].group, null)
})

test("resumo de alunos e materiais", () => {
  const s = summarizeStudents([
    { enrollmentStatus: "active", studyGroup: 1, neverSignedIn: true, accessBlock: null },
    { enrollmentStatus: "active", studyGroup: 3, neverSignedIn: false, accessBlock: null },
    { enrollmentStatus: "active", studyGroup: null, neverSignedIn: null, accessBlock: null },
    { enrollmentStatus: "suspended", studyGroup: 2, neverSignedIn: false, accessBlock: { reason: "x" } },
  ])
  assert.deepEqual(s.byGroup, { 1: 1, 2: 0, 3: 1, none: 1 })
  assert.equal(s.active, 3)
  assert.equal(s.suspended, 1)
  assert.equal(s.neverSignedIn, 1)
  assert.equal(s.blocked, 1)
  const m = summarizeMaterials([
    { type: "videoaula", url: "https://hotmart.com/a" },
    { type: "link", url: "https://elite.qconcursos.com/questoes?notebook_ids[]=1" },
    { type: "apostila", url: "https://hotmart.com/b" },
    { type: "link", url: "https://example.com" },
  ])
  assert.deepEqual(m, { total: 4, videos: 1, notebooks: 1, pdfs: 1, others: 1 })
})
