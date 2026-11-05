import test from "node:test"
import assert from "node:assert/strict"
import { splitStatement } from "../lib/mini-quizzes/statement.mjs"

test("sem texto associado: devolve o enunciado inteiro", () => {
  const r = splitStatement("Qual é a capital?\n\nEscolha uma.")
  assert.equal(r.passage, null)
  assert.equal(r.body, "Qual é a capital?\n\nEscolha uma.")
})

test("marcador [[/texto]] tem prioridade e some do texto", () => {
  const r = splitStatement("**Texto associado**\n\nTexto base.\n\nDisponível em: x\n\nMais texto.\n[[/texto]]\n\nComando?")
  assert.equal(r.passage, "Texto base.\n\nDisponível em: x\n\nMais texto.")
  assert.equal(r.body, "Comando?")
})

test("sem marcador: corta depois da última linha de fonte (comando com mais de um parágrafo)", () => {
  const r = splitStatement("**Texto associado**\r\n\r\nTítulo\r\n\r\nParágrafo.\r\n\r\nDisponível em: https://a.b\r\n\r\nAssinale o sentido de:\r\n\r\n“trecho”")
  assert.equal(r.passage, "Título\n\nParágrafo.\n\nDisponível em: https://a.b")
  assert.equal(r.body, "Assinale o sentido de:\n\n“trecho”")
})

test("sem fonte: o comando é o último parágrafo", () => {
  const r = splitStatement("**Texto associado**\n\nA Lebre e a Tartaruga\n\nUm dia...\n\nSobre o trecho, é correto afirmar:")
  assert.equal(r.passage, "A Lebre e a Tartaruga\n\nUm dia...")
  assert.equal(r.body, "Sobre o trecho, é correto afirmar:")
})

test("texto associado sem comando separado não é recolhido", () => {
  const r = splitStatement("**Texto associado**\n\nSó uma linha")
  assert.equal(r.passage, null)
  assert.equal(r.body, "Só uma linha")
})
