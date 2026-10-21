import { test } from "node:test"
import assert from "node:assert/strict"
import { weakPasswordReason } from "../lib/auth/password-strength.mjs"

test("avisa senhas comuns, repetidas, sequenciais e simples", () => {
  assert.equal(weakPasswordReason("12345678"), "common")
  assert.equal(weakPasswordReason("Senha123"), "common")
  assert.equal(weakPasswordReason("fortaleza"), "simple")
  assert.equal(weakPasswordReason("77777777"), "repeated")
  assert.equal(weakPasswordReason("abababab"), "repeated")
  assert.equal(weakPasswordReason("23456789"), "sequence")
  assert.equal(weakPasswordReason("milenaaa"), "simple")
  assert.equal(weakPasswordReason("guarda2026"), null)
})

test("não avisa senhas variadas e ignora senha curta (regra de tamanho é separada)", () => {
  assert.equal(weakPasswordReason("Guarda@Fort2026!"), null)
  assert.equal(weakPasswordReason("Gm#2026x"), null)
  assert.equal(weakPasswordReason("abc"), null)
})
