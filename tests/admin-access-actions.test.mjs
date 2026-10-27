import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import * as feedback from "../lib/admin/access-feedback.mjs"
import * as confirm from "../lib/auth/confirm.mjs"

// Run the actual server-action implementation with mocked network/auth/cache
// boundaries. SQL authorization is exercised separately against PostgreSQL.
function actions({ status = "active", denied = false, orphaned = false, profile = null } = {}) {
  const calls = []
  const refreshed = []
  let rpcCount = 0
  const selection = {
    select() { return this },
    eq() { return this },
    async single() { return { data: { status }, error: null } },
    async maybeSingle() { return { data: { user_id: "student-user", status }, error: null } },
  }
  const supabase = {
    async rpc(name, args) {
      calls.push({ name, args })
      rpcCount += 1
      if (orphaned && name === "admin_enroll_existing_student" && rpcCount === 1) {
        return { data: null, error: { message: "Only student accounts can be enrolled" } }
      }
      return { data: status, error: null }
    },
    from() { return selection },
  }
  const adminSelection = {
    select() { return this },
    eq() { return this },
    async maybeSingle() { return { data: profile, error: null } },
    async insert() { return { error: null } },
  }
  const admin = {
    auth: {
      admin: {
        async listUsers() { return { data: { users: [{ id: "auth-user", email: "orphan@test.invalid" }] }, error: null } },
        async getUserById(id) { return { data: { user: { id, email: "aluno@test.invalid" } }, error: null } },
        async generateLink(args) {
          calls.push({ name: "generateLink", args })
          return { data: { properties: { hashed_token: "hash-123" } }, error: null }
        },
      },
      async resetPasswordForEmail() { return { data: {}, error: null } },
    },
    from() { return adminSelection },
  }
  const source = readFileSync(new URL("../lib/admin/actions/enrollments.ts", import.meta.url), "utf8")
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  const dependencies = {
    "next/cache": { revalidatePath: (...args) => refreshed.push(args) },
    "@/lib/admin/auth": { requireAdmin: async () => {
      if (denied) throw new Error("Apenas administradores")
      return { supabase, userId: "admin-id" }
    } },
    "@/lib/admin/access-feedback.mjs": feedback,
    "@/lib/security/safe-error": {
      throwSafeDatabaseError: (_context, _error, publicMessage) => { throw new Error(publicMessage) },
    },
    "@/lib/supabase/admin": { createAdminClient: () => admin },
    "@/lib/auth/invite-url": { inviteRedirectUrl: () => "https://example.test/auth/confirm" },
    "@/lib/auth/confirm.mjs": confirm,
  }
  runInNewContext(js, { process: { env: { SITE_URL: "https://example.test" } }, exports: module.exports, require: (name) => {
    if (!(name in dependencies)) throw new Error("Unexpected import: " + name)
    return dependencies[name]
  } })
  return { ...module.exports, calls, refreshed }
}

test("action manual retorna acesso efetivo ativo, não falsa mensagem de revogação", async () => {
  const action = actions()
  const result = await action.setEnrollmentStatus("enrollment", "course", "revoked")
  assert.equal(result.effectiveStatus, "active")
  assert.match(result.message, /continua ativo.*Hotmart/)
  assert.equal(action.calls[0].name, "admin_set_manual_course_grant")
  assert.ok(action.refreshed.some(([path, type]) => path === "/aluno" && type === "layout"))
})

test("action de bloqueio normaliza motivo e envia somente IDs/ação; identidade vem do banco", async () => {
  const action = actions({ status: "suspended" })
  const result = await action.setCourseAccessBlock("enrollment", "course", true, "  Revisão do suporte  ")
  assert.equal(result.effectiveStatus, "suspended")
  assert.deepEqual(JSON.parse(JSON.stringify(action.calls[0].args)), {
    requested_enrollment_id: "enrollment",
    requested_course_id: "course",
    requested_blocked: true,
    requested_reason: "Revisão do suporte",
  })
  assert.ok(action.refreshed.some(([path]) => path === "/admin/cursos/course"))
})

test("ações sem admin, com motivo inválido ou ação adulterada não chamam RPC", async () => {
  const denied = actions({ denied: true })
  await assert.rejects(denied.setCourseAccessBlock("e", "c", true, "Motivo válido"), /administradores/)
  assert.equal(denied.calls.length, 0)
  const action = actions()
  await assert.rejects(action.setCourseAccessBlock("e", "c", true, " "), /motivo/)
  await assert.rejects(action.setCourseAccessBlock("e", "c", "false", "Motivo válido"), /inválida/)
  assert.equal(action.calls.length, 0)
})

test("concessão manual a bloqueado e desbloqueio sem direito não anunciam acesso liberado", async () => {
  const blocked = actions({ status: "suspended" })
  const granted = await blocked.enrollExistingStudent("course", " Student@Test.invalid ")
  assert.match(granted.message, /bloqueio administrativo/)
  assert.equal(blocked.calls[0].args.requested_email, "student@test.invalid")
  const revoked = actions({ status: "revoked" })
  const released = await revoked.setCourseAccessBlock("e", "c", false, "Análise concluída")
  assert.match(released.message, /não há direito ativo/)
})

test("acesso manual repara perfil apagado sem duplicar a conta de autenticação", async () => {
  const action = actions({ orphaned: true })
  const result = await action.enrollExistingStudent("course", "orphan@test.invalid", "Ellen Carneiro")
  assert.match(result.message, /cadastro reparado.*email.*reenviado/i)
  assert.equal(result.emailWarning, false)
  assert.equal(action.calls.filter(({ name }) => name === "admin_enroll_existing_student").length, 2)
})

test("link de acesso: gera link de recuperação pela plataforma sem enviar e-mail", async () => {
  const action = actions({ profile: { role: "student" } })
  const { link } = await action.createStudentAccessLink("enrollment", "course")
  const url = new URL(link)
  assert.equal(url.origin + url.pathname, "https://example.test/auth/confirm")
  assert.equal(url.searchParams.get("token_hash"), "hash-123")
  assert.equal(url.searchParams.get("type"), "recovery")
  assert.equal(url.searchParams.get("next"), "/auth/primeiro-acesso")
  const generated = action.calls.find(({ name }) => name === "generateLink")
  assert.deepEqual(JSON.parse(JSON.stringify(generated.args)), { type: "recovery", email: "aluno@test.invalid" })
})

test("link de acesso: recusa matrícula inativa, conta não aluno e quem não é admin", async () => {
  await assert.rejects(actions({ status: "suspended", profile: { role: "student" } }).createStudentAccessLink("e", "c"), /acesso ativo/)
  const adminAccount = actions({ profile: { role: "admin" } })
  await assert.rejects(adminAccount.createStudentAccessLink("e", "c"), /contas de aluno/)
  assert.ok(!adminAccount.calls.some(({ name }) => name === "generateLink"))
  await assert.rejects(actions({ denied: true }).createStudentAccessLink("e", "c"), /administradores/)
})
