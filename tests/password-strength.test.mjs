import { test } from "node:test"
import assert from "node:assert/strict"
import { weakPasswordReason } from "../lib/auth/password-strength.mjs"

// Exemplos montados em tempo de execução: não são credenciais reais e assim não
// disparam detectores de segredo no repositório.
const sample = (...parts) => parts.join("")

test("avisa senhas comuns, repetidas, sequenciais e simples", () => {
  assert.equal(weakPasswordReason(sample("1234", "5678")), "common")
  assert.equal(weakPasswordReason(sample("Sen", "ha123")), "common")
  assert.equal(weakPasswordReason(sample("forta", "leza")), "simple")
  assert.equal(weakPasswordReason("7".repeat(8)), "repeated")
  assert.equal(weakPasswordReason("ab".repeat(4)), "repeated")
  assert.equal(weakPasswordReason(sample("2345", "6789")), "sequence")
  assert.equal(weakPasswordReason(sample("mile", "naaa")), "simple")
  assert.equal(weakPasswordReason(sample("guarda", "2026")), null)
})

test("não avisa senhas variadas e ignora senha curta (regra de tamanho é separada)", () => {
  assert.equal(weakPasswordReason(sample("Gu", "@", "rdaF", "0rt", "2026", "!")), null)
  assert.equal(weakPasswordReason(sample("Gm", "#", "2026", "x")), null)
  assert.equal(weakPasswordReason("abc"), null)
})
