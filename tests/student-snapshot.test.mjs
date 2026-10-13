import { test } from "node:test"
import assert from "node:assert/strict"
import { buildStudentSnapshot, compareGoalsByRelease, toGoalSummary } from "../lib/student/snapshot.mjs"

const CREATED = "2026-10-10T12:00:00Z"
const subjects = [
  {
    id: "rl",
    name: "Raciocínio Lógico",
    position: 2,
    syllabus_topics: [{ id: "rl1", subject_id: "rl", parent_topic_id: null, title: "Proposições", position: 1 }],
  },
  {
    id: "pt",
    name: "Português",
    position: 1,
    syllabus_topics: [
      { id: "pt2", subject_id: "pt", parent_topic_id: null, title: "Crase", position: 2 },
      { id: "pt1a", subject_id: "pt", parent_topic_id: "pt1", title: "Sílabas", position: 1 },
      { id: "pt1", subject_id: "pt", parent_topic_id: null, title: "Fonologia", position: 1 },
    ],
  },
]
const item = (id, subject, topic, position, extra = {}) => ({
  id,
  subject_id: subject,
  topic_id: topic,
  subtopic_id: null,
  instructions: null,
  suggested_questions: null,
  position,
  archived_at: null,
  goal_item_materials: [],
  ...extra,
})
const goals = [
  { id: "g3", course_id: "c", title: "Meta 03", description: null, due_date: "2026-10-14", created_at: CREATED, goal_items: [item("i5", "rl", "rl1", 0)] },
  {
    id: "g1",
    course_id: "c",
    title: "Meta 01",
    description: null,
    due_date: "2026-10-12",
    created_at: CREATED,
    goal_items: [
      item("i2", "pt", "pt2", 2, {
        goal_item_materials: [
          { position: 2, materials: { id: "m2", title: "B", type: "link", url: "https://b" } },
          { position: 1, materials: { id: "m1", title: "A", type: "apostila", url: "https://a" } },
          { position: 3, materials: null },
        ],
      }),
      item("i1", "pt", "pt1", 1, { subtopic_id: "pt1a" }),
      item("ix", "pt", "pt2", 3, { archived_at: "2026-10-01" }),
    ],
  },
  { id: "g0", course_id: "c", title: "Meta 0 — Comece por aqui", description: null, due_date: null, created_at: CREATED, goal_items: [] },
  { id: "g2", course_id: "c", title: "Meta 02", description: null, due_date: "2026-10-13", created_at: CREATED, goal_items: [item("i3", "pt", "pt2", 0)] },
]

test("ordena metas pela liberação mesmo com created_at igual", () => {
  const sorted = [...goals].sort(compareGoalsByRelease).map((goal) => goal.title)
  assert.deepEqual(sorted, ["Meta 0 — Comece por aqui", "Meta 01", "Meta 02", "Meta 03"])
})

test("monta metas, materiais e edital com progresso sem contar tópico repetido", () => {
  const snapshot = buildStudentSnapshot({
    subjects,
    goals,
    completedItemIds: ["i2", "i3", "i1", "outro-curso"],
    now: new Date("2026-10-13T15:00:00Z"),
  })
  assert.deepEqual(
    snapshot.goals.map((goal) => [goal.number, goal.title, goal.isReleased, goal.progressStatus]),
    [
      [0, "Meta 0 — Comece por aqui", true, "pending"],
      [1, "Meta 01", true, "completed"],
      [2, "Meta 02", true, "completed"],
      [3, "Meta 03", false, "pending"],
    ],
  )
  const metaUm = snapshot.goals[1]
  assert.deepEqual(metaUm.items.map((entry) => entry.id), ["i1", "i2"])
  assert.equal(metaUm.items[0].subtopicName, "Sílabas")
  assert.deepEqual(metaUm.items[1].materials.map((material) => material.id), ["m1", "m2"])

  assert.deepEqual(snapshot.subjects.map((subject) => subject.name), ["Português", "Raciocínio Lógico"])
  const pt = snapshot.subjects[0]
  assert.deepEqual(pt.topics.map((topic) => topic.title), ["Fonologia", "Crase"])
  assert.deepEqual(pt.topics[0].subtopics.map((topic) => [topic.title, topic.studied]), [["Sílabas", true]])
  // pt2 aparece em duas metas, mas conta uma vez; pt1a vem do subtópico do item.
  assert.equal(pt.studied, 2)
  assert.equal(pt.total, 3)
  assert.equal(snapshot.totalTopics, 4)
  assert.equal(snapshot.studiedTopics, 2)
  assert.equal(snapshot.editalPercentage, 50)
})

test("resumo de lista não leva itens nem materiais", () => {
  const snapshot = buildStudentSnapshot({ subjects, goals, completedItemIds: [], now: new Date("2026-10-13T15:00:00Z") })
  const summary = toGoalSummary(snapshot.goals[1])
  assert.deepEqual(Object.keys(summary).sort(), ["dueDate", "id", "isReleased", "number", "progress", "progressStatus", "subjectNames", "title"])
  assert.deepEqual(summary.subjectNames, ["Português"])
})

test("aluno vê só as 5 últimas liberadas, as anteriores à parte e a prévia da próxima", async () => {
  const { studentGoalWindow } = await import("../lib/student/snapshot.mjs")
  const goals = Array.from({ length: 81 }, (_, index) => ({ number: index + 1, isReleased: index < 7 }))
  const view = studentGoalWindow(goals)
  assert.deepEqual(view.recent.map((goal) => goal.number), [7, 6, 5, 4, 3])
  assert.deepEqual(view.earlier.map((goal) => goal.number), [2, 1])
  assert.equal(view.next.number, 8)
  assert.equal(view.visible.length, 8)
  assert.equal(view.releasedCount, 7)

  const start = studentGoalWindow(goals.map((goal) => ({ ...goal, isReleased: goal.number === 1 })))
  assert.deepEqual(start.recent.map((goal) => goal.number), [1])
  assert.equal(start.next.number, 2)
  const done = studentGoalWindow(goals.map((goal) => ({ ...goal, isReleased: true })))
  assert.equal(done.next, null)
  assert.equal(done.recent.length, 5)
})

test("Meta 0 é concluível sem avançar o edital e não desloca as metas seguintes", () => {
  const orientation = item("welcome-read", "welcome", null, 0)
  const welcome = { id: "welcome-goal", course_id: "c", title: "Meta 0 — Comece por aqui", due_date: null, created_at: CREATED, goal_items: [orientation] }
  const input = { subjects: [...subjects, { id: "welcome", name: "Orientações iniciais", position: 3, syllabus_topics: [] }], goals: [welcome, ...goals.filter(goal => goal.id !== "g0")], completedItemIds: [], now: new Date("2026-10-20T12:00:00Z") }
  const before = buildStudentSnapshot(input)
  assert.deepEqual(before.goals.map(goal => goal.number), [0,1,2,3])
  assert.equal(before.goals[0].progressStatus,"pending")
  const after = buildStudentSnapshot({...input, completedItemIds:["welcome-read"]})
  assert.equal(after.goals[0].progress,100)
  assert.equal(after.goals[0].progressStatus,"completed")
  assert.equal(after.studiedTopics,before.studiedTopics)
  assert.equal(after.totalTopics,before.totalTopics)
})
