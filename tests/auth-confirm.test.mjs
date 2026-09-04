import assert from "node:assert/strict"
import test from "node:test"
import {
  ALLOWED_NEXT_PATHS,
  DEFAULT_NEXT_PATH,
  resolveConfirmRequest,
} from "../lib/auth/confirm.mjs"

test("1. token_hash e type=invite válidos liberam o fluxo com destino padrão", () => {
  const result = resolveConfirmRequest({
    tokenHash: "abc123",
    type: "invite",
    next: null,
  })

  assert.equal(result.valid, true)
  assert.equal(result.tokenHash, "abc123")
  assert.equal(result.type, "invite")
  assert.equal(result.next, DEFAULT_NEXT_PATH)
  assert.equal(result.next, "/auth/primeiro-acesso")
})

test("2. token_hash ausente é rejeitado", () => {
  const result = resolveConfirmRequest({ tokenHash: null, type: "invite" })

  assert.equal(result.valid, false)
  assert.equal(result.errorCode, "missing_token")
})

test("3. token_hash em branco é rejeitado", () => {
  const result = resolveConfirmRequest({ tokenHash: "   ", type: "invite" })

  assert.equal(result.valid, false)
  assert.equal(result.errorCode, "missing_token")
})

test("4. type ausente é rejeitado", () => {
  const result = resolveConfirmRequest({ tokenHash: "abc123", type: null })

  assert.equal(result.valid, false)
  assert.equal(result.errorCode, "invalid_type")
})

test("5. type fora da lista permitida (ex.: recovery) é rejeitado", () => {
  const result = resolveConfirmRequest({ tokenHash: "abc123", type: "recovery" })

  assert.equal(result.valid, false)
  assert.equal(result.errorCode, "invalid_type")
})

test("6. next explicitamente permitido é preservado", () => {
  const result = resolveConfirmRequest({
    tokenHash: "abc123",
    type: "invite",
    next: "/auth/primeiro-acesso",
  })

  assert.equal(result.valid, true)
  assert.equal(result.next, "/auth/primeiro-acesso")
  assert.ok(ALLOWED_NEXT_PATHS.includes(result.next))
})

test("7. next com URL externa (open redirect) é ignorado e cai no destino padrão", () => {
  const result = resolveConfirmRequest({
    tokenHash: "abc123",
    type: "invite",
    next: "https://evil.example.com/phish",
  })

  assert.equal(result.valid, true)
  assert.equal(result.next, DEFAULT_NEXT_PATH)
})

test("8. next protocol-relative (//evil.com) é ignorado e cai no destino padrão", () => {
  const result = resolveConfirmRequest({
    tokenHash: "abc123",
    type: "invite",
    next: "//evil.com",
  })

  assert.equal(result.valid, true)
  assert.equal(result.next, DEFAULT_NEXT_PATH)
})

test("9. next para um caminho interno fora da allow-list também é ignorado", () => {
  const result = resolveConfirmRequest({
    tokenHash: "abc123",
    type: "invite",
    next: "/admin",
  })

  assert.equal(result.valid, true)
  assert.equal(result.next, DEFAULT_NEXT_PATH)
})
