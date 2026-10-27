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
  assert.deepEqual(Object.keys(summary).sort(), ["dueDate", "id", "isReleased", "lockReason", "number", "progress", "progressStatus", "subjectNames", "title"])
  assert.deepEqual(summary.subjectNames, ["Português"])
})

const windowGoal = (number, { done = false, released = false, dated = true } = {}) => ({
  number,
  isReleased: released,
  isDateReleased: dated,
  totalItems: 2,
  completedItems: done ? 2 : 0,
})

test("aluno vê as metas até 10 à frente da atual (primeira não concluída)", async () => {
  const { studentGoalWindow } = await import("../lib/student/snapshot.mjs")
  // Concluiu as metas 1 a 7; a 8 é a atual e está liberada.
  const goals = Array.from({ length: 81 }, (_, index) =>
    windowGoal(index + 1, { done: index < 7, released: index < 8 }),
  )
  const view = studentGoalWindow(goals)
  assert.deepEqual(view.recent.map((goal) => goal.number), [8, 7, 6, 5, 4])
  assert.deepEqual(view.earlier.map((goal) => goal.number), [3, 2, 1])
  assert.deepEqual(view.upcoming.map((goal) => goal.number), [9, 10, 11, 12, 13, 14, 15, 16, 17])
  assert.equal(view.next.number, 9)
  assert.equal(view.visible.length, 17)
  assert.equal(view.releasedCount, 8)

  // Não concluiu a Meta 1: aparecem só até a Meta 10.
  const start = studentGoalWindow(goals.map((goal) => ({ ...goal, completedItems: 0, isReleased: goal.number === 1 })))
  assert.deepEqual(start.recent.map((goal) => goal.number), [1])
  assert.equal(start.next.number, 2)
  assert.equal(start.visible.at(-1).number, 10)

  const done = studentGoalWindow(goals.map((goal) => ({ ...goal, completedItems: 2, isReleased: true })))
  assert.equal(done.next, null)
  assert.deepEqual(done.upcoming, [])
  assert.equal(done.recent.length, 5)
  assert.equal(done.visible.length, 81)
})

test("meta com data futura não aparece nem como prévia", async () => {
  const { studentGoalWindow } = await import("../lib/student/snapshot.mjs")
  // Hoje é dia da Meta 8: a 8 está em andamento; da 9 em diante a data não chegou.
  const goals = Array.from({ length: 30 }, (_, index) =>
    windowGoal(index + 1, { done: index < 7, released: index < 8, dated: index < 8 }),
  )
  const view = studentGoalWindow(goals)
  assert.deepEqual(view.upcoming, [])
  assert.equal(view.next, null)
  assert.equal(view.visible.at(-1).number, 8)

  // Atrasado na Meta 2 com a data da Meta 8: vê da 2 à 8 (bloqueadas pela anterior), nada além.
  const behind = studentGoalWindow(
    goals.map((goal) => ({ ...goal, completedItems: goal.number < 2 ? 2 : 0, isReleased: goal.number <= 2 })),
  )
  assert.deepEqual(behind.upcoming.map((goal) => goal.number), [3, 4, 5, 6, 7, 8])
  assert.equal(behind.visible.at(-1).number, 8)
})

test("meta só libera com a data alcançada E a anterior concluída", () => {
  const now = new Date("2026-10-27T15:00:00Z")
  const seq = [
    { id: "a", course_id: "c", title: "Meta 1", due_date: "2026-10-26", created_at: CREATED, goal_items: [item("a1", "pt", "pt1", 0)] },
    { id: "b", course_id: "c", title: "Meta 2", due_date: "2026-10-27", created_at: CREATED, goal_items: [item("b1", "pt", "pt2", 0)] },
    { id: "c", course_id: "c", title: "Meta 3", due_date: "2026-10-28", created_at: CREATED, goal_items: [item("c1", "rl", "rl1", 0)] },
  ]
  const state = (completedItemIds) =>
    buildStudentSnapshot({ subjects, goals: seq, completedItemIds, now }).goals.map((goal) => [
      goal.number,
      goal.isReleased,
      goal.lockReason,
    ])
  // Comprou no dia 27 sem concluir nada: a Meta 2 já tem data, mas espera a Meta 1.
  assert.deepEqual(state([]), [
    [1, true, null],
    [2, false, "previous"],
    [3, false, "previous"],
  ])
  // Concluiu a Meta 1: a 2 abre; a 3 ainda depende da 2 (e da data).
  assert.deepEqual(state(["a1"]), [
    [1, true, null],
    [2, true, null],
    [3, false, "previous"],
  ])
  // Concluiu a 1 e a 2 antes do dia 28: a 3 espera só a data.
  assert.deepEqual(state(["a1", "b1"]), [
    [1, true, null],
    [2, true, null],
    [3, false, "date"],
  ])
})

test("meta sem itens não trava a sequência", () => {
  const snapshot = buildStudentSnapshot({ subjects, goals, completedItemIds: [], now: new Date("2026-10-20T12:00:00Z") })
  // g0 (Meta 0) não tem itens: a Meta 01 abre; a 02 espera a 01.
  assert.deepEqual(snapshot.goals.map((goal) => [goal.number, goal.isReleased]), [
    [0, true],
    [1, true],
    [2, false],
    [3, false],
  ])
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

test("importância do item vem do subtópico e, sem ela, do tópico; valores inválidos viram null", () => {
  const withImportance = [
    {
      id: "s",
      name: "Disciplina",
      position: 1,
      syllabus_topics: [
        { id: "t1", subject_id: "s", parent_topic_id: null, title: "Tópico alto", position: 1, importance: "high" },
        { id: "t1a", subject_id: "s", parent_topic_id: "t1", title: "Sub sem selo", position: 1, importance: null },
        { id: "t1b", subject_id: "s", parent_topic_id: "t1", title: "Sub baixo", position: 2, importance: "low" },
        { id: "t2", subject_id: "s", parent_topic_id: null, title: "Tópico inválido", position: 2, importance: "urgente" },
        { id: "t3", subject_id: "s", parent_topic_id: null, title: "Sem campo", position: 3 },
      ],
    },
  ]
  const g = [
    {
      id: "g",
      course_id: "c",
      title: "Meta 01",
      description: null,
      due_date: "2026-10-12",
      created_at: CREATED,
      goal_items: [
        item("a", "s", "t1", 0, { subtopic_id: "t1a" }),
        item("b", "s", "t1", 1, { subtopic_id: "t1b" }),
        item("c", "s", "t2", 2),
        item("d", "s", "t3", 3),
      ],
    },
  ]
  const { goals: out } = buildStudentSnapshot({ subjects: withImportance, goals: g, completedItemIds: [] })
  assert.deepEqual(out[0].items.map((entry) => entry.importance), ["high", "low", null, null])
})

test("materialsFromRelations ordena por posição e descarta material invisível", async () => {
  const { materialsFromRelations } = await import("../lib/student/snapshot.mjs")
  const list = materialsFromRelations([
    { position: 2, materials: { id: "b", title: "B", type: "link", url: "https://b", extra: 1 } },
    { position: 1, materials: { id: "a", title: "A", type: "apostila", url: "https://a" } },
    { position: 3, materials: null },
  ])
  assert.deepEqual(list.map((m) => m.id), ["a", "b"])
  assert.deepEqual(Object.keys(list[1]).sort(), ["id", "title", "type", "url"])
  assert.deepEqual(materialsFromRelations(undefined), [])
})

test("snapshot sem goal_item_materials (lista enxuta) gera itens com materiais vazios", async () => {
  const { buildStudentSnapshot } = await import("../lib/student/snapshot.mjs")
  const snap = buildStudentSnapshot({
    subjects: [],
    goals: [{ id: "g", course_id: "c", title: "Meta 1", description: null, due_date: null, created_at: null,
      goal_items: [{ id: "i", subject_id: "s", topic_id: null, instructions: null, suggested_questions: null, position: 1 }] }],
    completedItemIds: [],
  })
  assert.deepEqual(snap.goals[0].items[0].materials, [])
  assert.equal(snap.goals[0].totalItems, 1)
})
