import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import * as feedback from "../lib/admin/access-feedback.mjs"

// Run the actual server-action implementation with mocked network/auth/cache
// boundaries. SQL authorization is exercised separately against PostgreSQL.
function actions({ status = "active", denied = false } = {}) {
  const calls = []
  const refreshed = []
  const selection = {
    select() { return this },
    eq() { return this },
    async single() { return { data: { status }, error: null } },
  }
  const supabase = {
    async rpc(name, args) { calls.push({ name, args }); return { data: status, error: null } },
    from() { return selection },
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
  }
  runInNewContext(js, { exports: module.exports, require: (name) => {
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
