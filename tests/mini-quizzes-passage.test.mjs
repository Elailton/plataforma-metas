import test from "node:test"
import assert from "node:assert/strict"
import { formatPassage } from "../lib/mini-quizzes/passage.mjs"

const kinds = (parts) => parts.map((part) => part.kind)

test("junta linhas quebradas, tira numeração e separa rótulo, título e fonte", () => {
  const parts = formatPassage(
    "Texto I\r\nNegacionismo científico influencia no aumento de doenças\r\nevitáveis por vacina no mundo\r\n01 A vacinação é essencial e representa, além de atitude\r\n02 individual, um ato coletivo, segundo o professor Gonzalo\r\n03 Vecina Neto.\r\n04 Nas últimas décadas, o avanço da medicina levou à\r\n05 erradicação de algumas doenças mundiais.\r\nDisponível em: https://exemplo.br. Acesso em: 1 maio 2024.",
  )
  assert.deepEqual(kinds(parts), ["label", "title", "paragraph", "paragraph", "source"])
  assert.equal(parts[2].text, "A vacinação é essencial e representa, além de atitude individual, um ato coletivo, segundo o professor Gonzalo Vecina Neto.")
  assert.equal(parts[3].text, "Nas últimas décadas, o avanço da medicina levou à erradicação de algumas doenças mundiais.")
})

test("parágrafos separados por linha em branco e fonte com (com adaptações)", () => {
  const parts = formatPassage("Primeiro parágrafo com várias palavras para ser texto corrido.\n\nSegundo parágrafo.\n\nB. Autor. Obra. Brasília, 2018 (com adaptações).")
  assert.deepEqual(kinds(parts), ["paragraph", "paragraph", "source"])
})

test("versos curtos mantêm as quebras de linha", () => {
  const parts = formatPassage("Na beira do rio\no peixe pulou\ne a canoa seguiu")
  assert.deepEqual(parts, [{ kind: "verse", text: "Na beira do rio\no peixe pulou\ne a canoa seguiu" }])
})

test("números no começo da frase não são confundidos com numeração de linhas", () => {
  const parts = formatPassage("20 anos depois, a cidade mudou muito e ninguém reconhecia as ruas.\n\nOutro parágrafo do texto.")
  assert.equal(parts[0].text.startsWith("20 anos"), true)
})

test("referência com In: (obra coletiva) é tratada como fonte", () => {
  const parts = formatPassage("Texto corrido do parágrafo, com várias palavras para formar o corpo.\n\nC. Mauch. Considerações sobre a história da polícia. In: MÉTIS:")
  assert.deepEqual(parts.map((part) => part.kind), ["paragraph", "source"])
})
