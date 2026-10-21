import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildDiagnosis,
  canAttempt,
  groupQuizzesBySubject,
  monthKey,
  nextAvailableAt,
  normalizeAnswers,
  parseCooldownError,
  validateQuestionDraft,
} from "../lib/mini-quizzes/core.mjs"

test("intervalo de 7 dias para refazer", () => {
  const last = "2026-10-01T12:00:00Z"
  assert.equal(nextAvailableAt(last).toISOString(), "2026-10-08T12:00:00.000Z")
  assert.equal(canAttempt(last, new Date("2026-10-08T11:59:59Z")), false)
  assert.equal(canAttempt(last, new Date("2026-10-08T12:00:00Z")), true)
  assert.equal(canAttempt(null), true)
  assert.equal(parseCooldownError("MINI_QUIZ_COOLDOWN:2026-10-08T12:00:00Z").toISOString(), "2026-10-08T12:00:00.000Z")
  assert.equal(parseCooldownError("outro erro"), null)
})

test("mês no fuso de Brasília", () => {
  assert.equal(monthKey("2026-11-01T02:00:00Z"), "2026-10-01")
  assert.equal(monthKey("2026-11-01T03:00:00Z"), "2026-11-01")
})

test("lista por disciplina com situação de cada mini simulado", () => {
  const subjects = [
    { id: "s2", name: "Informática", position: 2 },
    { id: "s1", name: "Português", position: 1 },
    { id: "s3", name: "Sem simulados", position: 3 },
  ]
  const quizzes = [
    { id: "q1", subject_id: "s1", title: "Crase", position: 0 },
    { id: "q2", subject_id: "s2", title: "Word", position: 0 },
    { id: "q3", subject_id: "s1", title: "Acentuação", position: 0 },
  ]
  const attempts = [
    { id: "a1", quiz_id: "q1", attempt_number: 1, correct_count: 5, total_count: 10, submitted_at: "2026-10-01T12:00:00Z", month_start: "2026-10-01", is_first_of_month: true },
    { id: "a2", quiz_id: "q1", attempt_number: 2, correct_count: 9, total_count: 10, submitted_at: "2026-10-09T12:00:00Z", month_start: "2026-10-01", is_first_of_month: false },
    { id: "a3", quiz_id: "q2", attempt_number: 1, correct_count: 3, total_count: 4, submitted_at: "2026-10-01T12:00:00Z", month_start: "2026-10-01", is_first_of_month: true },
  ]
  const groups = groupQuizzesBySubject({ subjects, quizzes, questionCounts: { q1: 10 }, attempts, now: new Date("2026-10-12T12:00:00Z") })
  assert.deepEqual(groups.map((group) => group.name), ["Português", "Informática"])
  assert.deepEqual(groups[0].quizzes.map((quiz) => quiz.title), ["Acentuação", "Crase"])
  const crase = groups[0].quizzes[1]
  assert.equal(crase.status, "waiting")
  assert.equal(crase.firstScore, 50)
  assert.equal(crase.lastScore, 90)
  assert.equal(crase.lastAttemptId, "a2")
  assert.equal(crase.nextAvailableAt, "2026-10-16T12:00:00.000Z")
  assert.equal(groups[0].quizzes[0].status, "new")
  assert.equal(groups[1].quizzes[0].status, "retake")
})

test("diagnóstico usa só a primeira tentativa do mês e aponta assuntos fracos", () => {
  const subjects = [
    { id: "s1", name: "Português", position: 1, topics: [{ id: "t1", title: "Crase" }, { id: "t2", title: "Vírgula" }] },
    { id: "s2", name: "Informática", position: 2, topics: [{ id: "t3", title: "Word" }] },
  ]
  const attempts = [
    { id: "a1", quiz_id: "q1", month_start: "2026-10-01", is_first_of_month: true, submitted_at: "2026-10-01" },
    { id: "a2", quiz_id: "q1", month_start: "2026-10-01", is_first_of_month: false, submitted_at: "2026-10-09" },
    { id: "a3", quiz_id: "q2", month_start: "2026-10-01", is_first_of_month: true, submitted_at: "2026-10-02" },
    { id: "a4", quiz_id: "q1", month_start: "2026-11-01", is_first_of_month: true, submitted_at: "2026-11-02" },
  ]
  const answer = (attempt_id, subject_id, topic_id, is_correct) => ({ attempt_id, subject_id, topic_id, is_correct })
  const answers = [
    answer("a1", "s1", "t1", false), answer("a1", "s1", "t1", false), answer("a1", "s1", "t1", true),
    answer("a1", "s1", "t2", true),
    answer("a2", "s1", "t1", true), answer("a2", "s1", "t1", true), answer("a2", "s1", "t1", true),
    answer("a3", "s2", "t3", true), answer("a3", "s2", "t3", true),
    answer("a4", "s1", "t1", true), answer("a4", "s1", "t1", true), answer("a4", "s1", "t1", true),
  ]

  const october = buildDiagnosis({ subjects, attempts, answers, month: "2026-10-01" })
  assert.deepEqual(october.months, ["2026-11-01", "2026-10-01"])
  assert.equal(october.selectedMonth, "2026-10-01")
  assert.equal(october.quizzesCounted, 2)
  assert.deepEqual(october.overall, { correct: 4, total: 6, percentage: 67 })
  assert.equal(october.subjects[0].percentage, 50)
  assert.deepEqual(october.subjects[0].topics.map((topic) => [topic.title, topic.percentage]), [["Crase", 33], ["Vírgula", 100]])
  assert.deepEqual(october.weakTopics.map((topic) => topic.title), ["Crase"])
  assert.deepEqual(october.subjects[0].evolution, [
    { month: "2026-10-01", total: 4, percentage: 50 },
    { month: "2026-11-01", total: 3, percentage: 100 },
  ])

  const latest = buildDiagnosis({ subjects, attempts, answers })
  assert.equal(latest.selectedMonth, "2026-11-01")
  assert.deepEqual(latest.overall, { correct: 3, total: 3, percentage: 100 })
  assert.equal(latest.weakTopics.length, 0)

  const empty = buildDiagnosis({ subjects, attempts: [], answers: [] })
  assert.equal(empty.selectedMonth, null)
  assert.equal(empty.overall.total, 0)
})

test("respostas normalizadas e validação de questões", () => {
  assert.deepEqual(normalizeAnswers({ q1: "A", q2: "Z", intruso: "B" }, ["q1", "q2", "q3"]), { q1: "A", q2: null, q3: null })
  const alternatives = [{ key: "A", text: "x" }, { key: "B", text: "y" }]
  assert.equal(validateQuestionDraft({ statement: "Enunciado", alternatives, correctKey: "A" }), null)
  assert.match(validateQuestionDraft({ statement: " ", alternatives, correctKey: "A" }), /enunciado/)
  assert.match(validateQuestionDraft({ statement: "E", alternatives: [alternatives[0]], correctKey: "A" }), /duas/)
  assert.match(validateQuestionDraft({ statement: "E", alternatives, correctKey: "C" }), /correta/)
})

test("questões coladas em texto viram rascunhos estruturados", async () => {
  const { parseQuestionsText } = await import("../lib/mini-quizzes/core.mjs")
  const parsed = parseQuestionsText(`1. Sobre a crase, assinale:
continuação do enunciado

A) Primeira
B) Segunda que
continua
C) Terceira
Gabarito: b
Comentário: Porque sim.
Segunda linha.

2) Outra questão
a) x
b) y
Gabarito: A`)
  assert.equal(parsed.length, 2)
  assert.equal(parsed[0].statement, "Sobre a crase, assinale:\ncontinuação do enunciado")
  assert.deepEqual(parsed[0].alternatives.map((item) => item.key), ["A", "B", "C"])
  assert.equal(parsed[0].alternatives[1].text, "Segunda que continua")
  assert.equal(parsed[0].correctKey, "B")
  assert.equal(parsed[0].explanation, "Porque sim.\nSegunda linha.")
  assert.equal(parsed[1].statement, "Outra questão")
  assert.equal(parsed[1].correctKey, "A")
})

test("simulados semanais (sem disciplina) vêm primeiro, ordenados pela semana", async () => {
  const { groupQuizzesBySubject, WEEKLY_GROUP_ID } = await import("../lib/mini-quizzes/core.mjs")
  const groups = groupQuizzesBySubject({
    subjects: [{ id: "pt", name: "Português", position: 1 }],
    quizzes: [
      { id: "w2", subject_id: null, title: "Semana 2", week_number: 2, release_date: "2026-11-08" },
      { id: "p1", subject_id: "pt", title: "Crase", position: 1 },
      { id: "w1", subject_id: null, title: "Semana 1", week_number: 1, release_date: "2026-11-01" },
    ],
    questionCounts: { w1: 50, w2: 50, p1: 10 },
    attempts: [],
  })
  assert.deepEqual(groups.map((group) => group.id), [WEEKLY_GROUP_ID, "pt"])
  assert.equal(groups[0].name, "Simulados semanais")
  assert.deepEqual(groups[0].quizzes.map((quiz) => [quiz.id, quiz.weekNumber, quiz.questionCount]), [["w1", 1, 50], ["w2", 2, 50]])
})
