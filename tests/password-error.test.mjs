import { test } from "node:test"
import assert from "node:assert/strict"
import {
  GENERIC_PASSWORD_MESSAGE,
  SAME_PASSWORD_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  WEAK_PASSWORD_MESSAGE,
  passwordErrorMessage,
} from "../lib/auth/password-error.mjs"

test("senha vazada/fraca explica o motivo e não manda pedir novo convite", () => {
  assert.equal(passwordErrorMessage({ code: "weak_password", message: "x", status: 422 }), WEAK_PASSWORD_MESSAGE)
  assert.equal(
    passwordErrorMessage({ message: "Password is known to be weak and easy to guess, please choose a different one.", status: 422 }),
    WEAK_PASSWORD_MESSAGE,
  )
  assert.match(WEAK_PASSWORD_MESSAGE, /link continua valendo/)
})

test("outras recusas têm mensagens próprias", () => {
  assert.equal(passwordErrorMessage({ code: "same_password" }), SAME_PASSWORD_MESSAGE)
  assert.equal(passwordErrorMessage({ code: "session_not_found", status: 403 }), SESSION_EXPIRED_MESSAGE)
  assert.equal(passwordErrorMessage({ message: "boom", status: 500 }), GENERIC_PASSWORD_MESSAGE)
  assert.equal(passwordErrorMessage(null), GENERIC_PASSWORD_MESSAGE)
})
