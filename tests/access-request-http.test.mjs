import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { handleAccessRequest } from "../lib/auth/access-request-http.mjs"
import { RESEND_GENERIC_MESSAGE } from "../lib/auth/resend-access.mjs"

const ORIGIN = "https://sg-diagnostico.vercel.app"
function fixture({ eligible = false, fail = false } = {}) {
  const scheduled = [], sent = [], rows = [], reserved = new Set()
  const options = { siteUrl: "https://mentoria.cursoprofericklima.com.br", schedule: job => scheduled.push(job), dependencies: () => ({
    hash: value => value,
    async reserve({ requestKey }) {
      if (fail) throw new Error("database")
      if (reserved.has(requestKey)) return { accepted: false, requestId: null }
      reserved.add(requestKey); rows.push("accepted"); return { accepted: true, requestId: rows.length }
    },
    async hasActiveStudentAccess() { return eligible },
    async sendAccessEmail(email) { sent.push(email) },
    async updateOutcome(id, outcome) { rows[id - 1] = outcome },
  }) }
  const body = { email: " Aluno@Teste.invalid ", request_id: randomUUID() }
  const req = (data = body, init = {}) => new Request("https://mentoria.cursoprofericklima.com.br/api/access/request", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json", "x-real-ip": "1.2.3.4", ...init.headers }, body: typeof data === "string" ? data : JSON.stringify(data) })
  return { options, body, req, scheduled, sent, rows }
}

test("API: resposta genérica antecede verificação e envio ao próprio e-mail", async () => {
  const f = fixture({ eligible: true })
  const res = await handleAccessRequest(f.req(), f.options)
  assert.equal(res.status, 202)
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), ORIGIN)
  assert.deepEqual(await res.json(), { status: "accepted", message: RESEND_GENERIC_MESSAGE })
  assert.deepEqual(f.sent, [])
  await f.scheduled[0]()
  assert.deepEqual(f.sent, ["aluno@teste.invalid"])
  assert.deepEqual(f.rows, ["sent"])
  assert.equal((await handleAccessRequest(f.req(), f.options)).status, 202)
  assert.equal(f.scheduled.length, 1)
})

test("API: pessoa sem direito ativo recebe a mesma resposta, sem e-mail ou matrícula", async () => {
  const f = fixture()
  assert.equal((await handleAccessRequest(f.req(), f.options)).status, 202)
  await f.scheduled[0]()
  assert.deepEqual(f.sent, [])
  assert.deepEqual(f.rows, ["skipped"])
})

test("API: recusa outro destinatário, curso, papel, origem, JSON inválido e corpo grande", async () => {
  const f = fixture()
  for (const extra of [{ course_id: randomUUID() }, { role: "admin" }, { recipient: "outro@teste.invalid" }, { redirectTo: "https://evil.invalid" }]) {
    assert.equal((await handleAccessRequest(f.req({ ...f.body, ...extra }), f.options)).status, 422)
  }
  assert.equal((await handleAccessRequest(f.req(f.body, { headers: { origin: "https://evil.invalid" } }), f.options)).status, 403)
  assert.equal((await handleAccessRequest(f.req("{"), f.options)).status, 400)
  assert.equal((await handleAccessRequest(f.req("x".repeat(4097)), f.options)).status, 413)
  assert.equal(f.scheduled.length, 0)
})

test("API: preflight não cria pedido; falha de persistência não simula aceite", async () => {
  const f = fixture({ fail: true })
  const preflight = new Request("https://mentoria.cursoprofericklima.com.br/api/access/request", { method: "OPTIONS", headers: { origin: ORIGIN } })
  assert.equal((await handleAccessRequest(preflight, f.options)).status, 204)
  assert.equal((await handleAccessRequest(f.req(), f.options)).status, 503)
  assert.equal(f.scheduled.length, 0)
})
