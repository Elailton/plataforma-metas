import { test } from "node:test"
import assert from "node:assert/strict"
import {
  filterBySearch,
  matchesSearch,
  normalizeSearchText,
  searchTerms,
} from "../lib/search.mjs"

test("normaliza acentos, maiúsculas e espaços", () => {
  assert.equal(normalizeSearchText("  Regência   VERBAL  "), "regencia verbal")
  assert.equal(normalizeSearchText("Concordância"), "concordancia")
  assert.equal(normalizeSearchText(null), "")
  assert.deepEqual(searchTerms("   "), [])
})

test("pesquisa ignora acentos nos dois lados", () => {
  assert.equal(matchesSearch("regencia", ["Qconcursos - Caderno de Regência nominal e verbal"]), true)
  assert.equal(matchesSearch("REGÊNCIA", ["regencia verbal"]), true)
  assert.equal(matchesSearch("crase", ["Pontuação"]), false)
})

test("todas as palavras precisam aparecer, em qualquer ordem e campo", () => {
  const fields = ["Caderno de Crase", "Língua Portuguesa", "Link"]
  assert.equal(matchesSearch("portuguesa crase", fields), true)
  assert.equal(matchesSearch("crase informatica", fields), false)
})

test("pesquisa vazia devolve a lista original", () => {
  const items = [{ title: "A" }, { title: "B" }]
  assert.equal(filterBySearch(items, "", (item) => [item.title]), items)
  assert.equal(filterBySearch(items, "  ", (item) => [item.title]), items)
})

test("filtra e ignora campos vazios", () => {
  const items = [
    { title: "Mini Simulado - Informática 00", subject: "Informática" },
    { title: "Apostila em PDF", subject: null },
    { title: "Crase - Parte 01", subject: "Língua Portuguesa" },
  ]
  const result = filterBySearch(items, "informatica", (item) => [item.title, item.subject])
  assert.deepEqual(result.map((item) => item.title), ["Mini Simulado - Informática 00"])
})
