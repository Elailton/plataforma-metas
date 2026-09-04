import assert from "node:assert/strict"
import test from "node:test"
import { effectiveAccessStatus, normalizeBlockReason, manualAccessMessage, blockAccessMessage } from "../lib/admin/access-feedback.mjs"

test("feedback manual usa o acesso efetivo e não anuncia remoção de compra válida", () => {
  for (const requested of ["suspended", "revoked"]) {
    assert.match(manualAccessMessage(requested, "active"), /continua ativo.*Hotmart/)
  }
  assert.match(manualAccessMessage("active", "suspended"), /bloqueio administrativo/)
  assert.match(manualAccessMessage("revoked", "revoked"), /indisponível/)
})

test("desbloquear não promete acesso quando todos os direitos terminaram", () => {
  assert.match(blockAccessMessage(false, "revoked"), /não há direito ativo/)
  assert.match(blockAccessMessage(false, "suspended"), /não há direito ativo/)
  assert.match(blockAccessMessage(false, "active"), /Acesso restaurado/)
})

test("motivo é normalizado e validado; retorno inválido nunca vira sucesso", () => {
  assert.equal(normalizeBlockReason("  Revisão do acesso  "), "Revisão do acesso")
  for (const value of [null, "", "  ", "ab", "a".repeat(501)]) {
    assert.throws(() => normalizeBlockReason(value))
  }
  for (const value of [null, undefined, "", "blocked", {}, true]) {
    assert.throws(() => effectiveAccessStatus(value))
  }
})
