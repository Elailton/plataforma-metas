import test from "node:test"
import assert from "node:assert/strict"
import {
  ESSAY_CRITERIA,
  essayImagePath,
  essayReviewDeadline,
  essayStatusLabel,
  parseEssayPrompt,
  ESSAY_MAX_BODY,
  parseEssayScores,
  remainingSeconds,
} from "../lib/mini-quizzes/essay.mjs"

test("redação: prazo de correção é o envio + 7 dias", () => {
  assert.equal(essayReviewDeadline("2026-11-08T12:00:00.000Z").toISOString(), "2026-11-15T12:00:00.000Z")
  assert.equal(essayReviewDeadline("x"), null)
})

test("redação: situação mostrada ao aluno", () => {
  assert.equal(essayStatusLabel(null), null)
  assert.equal(essayStatusLabel({ status: "pending", score_total: null }), "Aguardando correção")
  assert.equal(essayStatusLabel({ status: "graded", score_total: 27 }), "Nota 27/40")
  assert.equal(essayStatusLabel({ status: "annulled", score_total: 0 }), "Redação anulada")
})

test("redação: 4 critérios de 0 a 10, inteiros", () => {
  assert.equal(ESSAY_CRITERIA.length, 4)
  assert.deepEqual(parseEssayScores(["8", 7, "10", "0"]), [8, 7, 10, 0])
  assert.equal(parseEssayScores([8, 7, 10]), null)
  assert.equal(parseEssayScores([8, 7, 11, 1]), null)
  assert.equal(parseEssayScores([8, 7, 9.5, 1]), null)
  assert.equal(parseEssayScores([8, 7, "", 1]), null)
})

test("prova: cronômetro regressivo pelo tempo real", () => {
  assert.equal(remainingSeconds(300, 0), 18000)
  assert.equal(remainingSeconds(300, 18060), -60)
  assert.equal(remainingSeconds(null, 10), null)
})

test("redação: foto fica na pasta do aluno e da tentativa", () => {
  assert.equal(essayImagePath("u1", "a1", 0, "x", "image/png"), "u1/a1/1-x.png")
  assert.equal(essayImagePath("u1", "a1", 2, "y", "image/jpeg"), "u1/a1/3-y.jpg")
})

test("redação: folha para baixar vem do marcador e sai do texto exibido", () => {
  const parsed = parseEssayPrompt("[[folha:/folhas-redacao/pmpe-simulado-geral-01.pdf]]\n\n**PROPOSTA**\nTexto")
  assert.equal(parsed.sheetUrl, "/folhas-redacao/pmpe-simulado-geral-01.pdf")
  assert.equal(parsed.text, "**PROPOSTA**\nTexto")
  assert.equal(parseEssayPrompt("Sem folha").sheetUrl, null)
  // Só arquivos da pasta pública de folhas, sem endereços externos.
  assert.equal(parseEssayPrompt("[[folha:https://x.com/a.pdf]]").sheetUrl, null)
  assert.equal(parseEssayPrompt("[[folha:/folhas-redacao/../x.pdf]]").sheetUrl, null)
})

test("redação: texto aceita cerca de 100 linhas", () => {
  assert.ok(ESSAY_MAX_BODY >= 10000)
})
