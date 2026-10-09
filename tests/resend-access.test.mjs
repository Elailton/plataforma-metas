import assert from "node:assert/strict"
import test from "node:test"
import {
  acceptResendRequest,
  clientIpFrom,
  normalizeResendEmail,
  RESEND_GENERIC_MESSAGE,
  RESEND_LIMITS,
} from "../lib/auth/resend-access.mjs"

function fakeDeps({ students = [], admins = [], failSend = false } = {}) {
  const rows = []
  const sent = []
  return {
    rows,
    sent,
    hash: (value) => `h(${value})`,
    async countRecent({ emailHash, ipHash, since }) {
      const recent = rows.filter((row) => row.createdAt >= since)
      return {
        email: recent.filter((row) => row.emailHash === emailHash).length,
        ip: recent.filter((row) => row.ipHash === ipHash).length,
        total: recent.length,
      }
    },
    async record({ emailHash, ipHash, outcome }) {
      rows.push({ id: rows.length + 1, emailHash, ipHash, outcome, createdAt: new Date() })
      return rows.length
    },
    async updateOutcome(id, outcome) {
      rows[id - 1].outcome = outcome
    },
    async hasActiveStudentAccess(email) {
      return students.includes(email) && !admins.includes(email)
    },
    async sendAccessEmail(email) {
      if (failSend) throw new Error("smtp")
      sent.push(email)
    },
  }
}

async function run(deps, email, ip = "10.0.0.1") {
  const result = await acceptResendRequest({ email, ip }, deps)
  const delivered = result.deliver ? await result.deliver() : null
  return { ...result, delivered }
}

test("reenvio: aluno com matrícula ativa recebe o link; resposta é genérica", async () => {
  const deps = fakeDeps({ students: ["aluno@teste.com"] })
  const result = await run(deps, " Aluno@Teste.com ")
  assert.equal(result.message, RESEND_GENERIC_MESSAGE)
  assert.equal(result.delivered, "sent")
  assert.deepEqual(deps.sent, ["aluno@teste.com"])
})

test("reenvio: e-mail sem conta, sem matrícula ou administrador recebe a mesma resposta e nenhum envio", async () => {
  const deps = fakeDeps({ students: ["admin@teste.com"], admins: ["admin@teste.com"] })
  const unknown = await run(deps, "ninguem@teste.com")
  const admin = await run(deps, "admin@teste.com")
  const invalid = await run(deps, "nao-e-email")
  for (const result of [unknown, admin, invalid]) assert.equal(result.message, RESEND_GENERIC_MESSAGE)
  assert.equal(unknown.delivered, "skipped")
  assert.equal(admin.delivered, "skipped")
  assert.equal(invalid.deliver, null)
  assert.deepEqual(deps.sent, [])
})

test("reenvio: limite por e-mail e por IP com a mesma mensagem genérica", async () => {
  const deps = fakeDeps({ students: ["aluno@teste.com"] })
  for (let index = 0; index < RESEND_LIMITS.perEmail; index += 1) {
    await run(deps, "aluno@teste.com", `10.0.0.${index}`)
  }
  const limited = await run(deps, "aluno@teste.com", "10.9.9.9")
  assert.equal(limited.outcome, "limited")
  assert.equal(limited.message, RESEND_GENERIC_MESSAGE)
  assert.equal(deps.sent.length, RESEND_LIMITS.perEmail)

  const byIp = fakeDeps()
  for (let index = 0; index < RESEND_LIMITS.perIp; index += 1) await run(byIp, `x${index}@teste.com`, "1.1.1.1")
  assert.equal((await run(byIp, "outro@teste.com", "1.1.1.1")).outcome, "limited")
})

test("reenvio: registros guardam só hashes, nunca o e-mail ou o IP em claro", async () => {
  const deps = fakeDeps({ students: ["aluno@teste.com"] })
  deps.hash = (value) => `sha-${value.length}`
  await run(deps, "aluno@teste.com", "200.1.1.1")
  const serialized = JSON.stringify(deps.rows)
  assert.equal(serialized.includes("aluno@teste.com"), false)
  assert.equal(serialized.includes("200.1.1.1"), false)
  assert.equal(deps.rows[0].outcome, "sent")
})

test("reenvio: falha de envio fica registrada sem mudar a resposta", async () => {
  const deps = fakeDeps({ students: ["aluno@teste.com"], failSend: true })
  const result = await run(deps, "aluno@teste.com")
  assert.equal(result.message, RESEND_GENERIC_MESSAGE)
  assert.equal(result.delivered, "failed")
})

test("reenvio: IP e e-mail de entrada são tratados como não confiáveis", () => {
  const headers = (values) => ({ get: (name) => values[name] ?? null })
  assert.equal(clientIpFrom(headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4")
  assert.equal(clientIpFrom(headers({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.2.3.4" })), "9.9.9.9")
  assert.equal(clientIpFrom(headers({})), "unknown")
  assert.equal(normalizeResendEmail(null), null)
  assert.equal(normalizeResendEmail("a".repeat(400) + "@x.com"), null)
})
