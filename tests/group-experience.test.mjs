import assert from "node:assert/strict"
import { test } from "node:test"
import { audienceLabel, groupLabel, hiddenHrefs, normalizeDisabledFeatures, settingsGroupFor } from "../lib/groups/experience.mjs"

test("configuração por grupo: grupo efetivo, abas escondidas e rótulos do admin", () => {
  assert.equal(settingsGroupFor(false, null), 1)
  assert.equal(settingsGroupFor(true, 3), 3)
  assert.equal(settingsGroupFor(true, null), null)
  assert.deepEqual(normalizeDisabledFeatures(["relatorio", "x", "relatorio", "ranking"]), ["relatorio", "ranking"])
  assert.deepEqual(hiddenHrefs(["relatorio", "ranking"]), ["/aluno/relatorio"])
  assert.equal(groupLabel(3, 1), "Grupo 3 · teste (vê o G1)")
  assert.equal(audienceLabel([3]), "Só teste (Grupo 3)")
  assert.equal(audienceLabel([1, 2]), "Grupos 1 e 2")
  assert.equal(audienceLabel([2, 3]), "Grupo 2 + teste")
})
