import { test } from "node:test"
import assert from "node:assert/strict"
import { formatMinutes, goalsForPreview, minutesInText, parsePreviewGroup, summarizeGoal } from "../lib/goals/preview.mjs"

test("lê os minutos escritos nas orientações", () => {
  assert.equal(minutesInText("Assista às videoaulas (~42 min em 1,5x)."), 42)
  assert.equal(minutesInText("Escreva 1 redação em 50 min, cronometrados."), 50)
  assert.equal(minutesInText("Caderno de erros (10 min, ao final) … revisão semanal (15 min): …"), 25)
  assert.equal(minutesInText("Resolva as questões do caderno."), 0)
  assert.equal(minutesInText(null), 0)
})

test("resume tempo, questões e disciplinas da meta", () => {
  const summary = summarizeGoal({
    description: "Caderno de erros (10 min, ao final da meta).",
    items: [
      { subjectId: "pt", instructions: "Assista (~40 min).", suggestedQuestions: null },
      { subjectId: "pt", instructions: "1ª resolução: 20 questões (~60 min).", suggestedQuestions: 20 },
      { subjectId: "rl", instructions: "Revise o resumo.", suggestedQuestions: 5 },
    ],
  })
  assert.deepEqual(summary, { minutes: 110, questions: 25, items: 3, itemsWithoutTime: 1, subjects: 2 })
})

test("formata a duração", () => {
  assert.equal(formatMinutes(45), "45 min")
  assert.equal(formatMinutes(180), "3h")
  assert.equal(formatMinutes(176), "2h56")
})

test("filtra por grupo, ignora arquivadas e ordena pela liberação", () => {
  const goals = [
    { title: "Meta 02", status: "published", dueDate: "2026-10-13", targetGroups: [1] },
    { title: "Meta 01", status: "published", dueDate: "2026-10-12", targetGroups: [1] },
    { title: "Meta 01", status: "published", dueDate: "2026-10-12", targetGroups: [2] },
    { title: "Antiga", status: "archived", dueDate: null, targetGroups: [1, 2] },
    { title: "Comece por aqui", status: "published", dueDate: null, targetGroups: [1, 2] },
    { title: "Rascunho", status: "draft", dueDate: "2026-10-20", targetGroups: [1, 2] },
  ]
  assert.deepEqual(goalsForPreview(goals, 1).map((g) => g.title), ["Comece por aqui", "Meta 01", "Meta 02", "Rascunho"])
  assert.equal(goalsForPreview(goals, 2).length, 3)
  assert.equal(goalsForPreview(goals, null).length, 5)
  // Teste (G3) vê o que é do G1 (espelho padrão) e o que é só dele.
  assert.equal(goalsForPreview(goals, 3).length, goalsForPreview(goals, 1).length)
})

test("grupo da URL aceita 1, 2 ou 3 (teste)", () => {
  assert.equal(parsePreviewGroup("1"), 1)
  assert.equal(parsePreviewGroup(["2"]), 2)
  assert.equal(parsePreviewGroup("3"), 3)
  assert.equal(parsePreviewGroup("4"), null)
  assert.equal(parsePreviewGroup(undefined), null)
})
