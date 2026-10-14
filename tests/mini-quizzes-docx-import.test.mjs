import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { parseMiniQuizDocx, titleFromFilename } from "../lib/mini-quizzes/docx-import.mjs"

test("lê mini simulado do Word com apoio, ênfases, imagem e gabarito", async () => {
  const buffer = await readFile(new URL("./fixtures/mini-simulado-exemplo.docx", import.meta.url))
  const result = await parseMiniQuizDocx(buffer)
  assert.equal(result.title, "MINI SIMULADO DE EXEMPLO")
  assert.deepEqual(result.warnings, [])
  assert.equal(result.questions.length, 2)

  const [first, second] = result.questions
  assert.equal(first.statement, "TEXTO\nTexto de apoio da primeira questão.\nNo trecho __em destaque__, assinale a opção **CORRETA**.")
  assert.deepEqual(first.alternatives.map((item) => item.key), ["A", "B", "C", "D", "E"])
  assert.equal(first.alternatives[2].text, "Alternativa C da primeira.")
  assert.equal(first.correctKey, "C")
  assert.equal(first.explanation, "Gabarito: LETRA C.\nPorque sim.")

  assert.match(second.statement, /^\[\[imagem:[0-9a-f]{16}\]\]\n\nObserve a figura acima\.\n\(\\_\\_\) Lacuna \\_\\_\\_\\_\\_\\_ preenchida\.$/)
  assert.equal(second.alternatives.length, 4)
  assert.equal(second.correctKey, "B")

  // A imagem do rodapé (depois da última questão) não entra.
  assert.equal(result.images.length, 1)
  assert.equal(result.images[0].mime, "image/png")
})

test("título sugerido sem o prefixo da disciplina", () => {
  assert.equal(titleFromFilename("Português - Crase.docx"), "Crase")
  assert.equal(titleFromFilename("Extravagante - Tortura - Lei n° 9.455 de 1997.docx"), "Tortura - Lei n° 9.455 de 1997")
  assert.equal(titleFromFilename("Simulado.docx"), "Simulado")
})

test("arquivo que não é .docx gera erro claro", async () => {
  await assert.rejects(parseMiniQuizDocx(new TextEncoder().encode("não é zip")), /inválido/)
})
