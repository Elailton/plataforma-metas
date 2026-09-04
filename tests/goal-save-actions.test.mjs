import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
function load(relativePath, dependencies) {
  const source = readFileSync(new URL("../" + relativePath, import.meta.url), "utf8")
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText
  const exports = {}
  runInNewContext(code, { exports, require: (name) => {
    if (name in dependencies) return dependencies[name]
    throw new Error("Unexpected import " + name)
  } })
  return exports
}

function actions({ denied = false, error = null } = {}) {
  const calls = [], refreshed = []
  const exports = load("lib/admin/actions/goals.ts", {
    "next/cache": { revalidatePath: (...args) => refreshed.push(args) },
    "@/lib/admin/auth": { requireAdmin: async () => {
      if (denied) throw new Error("Apenas administradores")
      return { supabase: {
        rpc: async (name, args) => { calls.push({ name, args }); return { data: "saved-goal", error } },
        from: () => { throw new Error("Save must use a single atomic RPC, not table writes") },
      } }
    } },
  })
  return { ...exports, calls, refreshed }
}
const input = { courseId: "course", title: " Título ", description: "", status: "published", dueDate: null,
  updatedAt: "2026-09-04T12:00:00.000Z",
  items: [{ id: "stable-item", subjectId: "subject", topicId: "topic", instructions: "Texto", suggestedQuestions: 5, materialIds: ["m", "m"] }] }

test("update usa uma RPC, envia ID estável/versão e invalida dados do aluno", async () => {
  const action = actions()
  await action.updateGoal("goal", input)
  assert.equal(action.calls.length, 1)
  assert.equal(action.calls[0].name, "admin_save_goal")
  assert.equal(action.calls[0].args.requested_items[0].id, "stable-item")
  assert.equal(action.calls[0].args.requested_updated_at, input.updatedAt)
  assert.equal(action.calls[0].args.requested_items[0].material_ids.length, 1)
  assert.ok(action.refreshed.some(([path, type]) => path === "/aluno" && type === "layout"))
})

test("criar não reutiliza IDs/conclusões; falha não anuncia sucesso nem revalida", async () => {
  const action = actions()
  await action.createGoal(input)
  assert.equal(action.calls[0].args.requested_goal_id, null)
  assert.equal(action.calls[0].args.requested_items[0].id, null)
  const failed = actions({ error: { message: "Recarregue a meta" } })
  await assert.rejects(failed.updateGoal("goal", input), /Recarregue/)
  assert.equal(failed.refreshed.length, 0)
  const denied = actions({ denied: true })
  await assert.rejects(denied.updateGoal("goal", input), /administradores/)
  assert.equal(denied.calls.length, 0)
})

test("formulário real conserva o ID carregado e envia a versão ao salvar", async () => {
  const submitted = []
  const dependencies = {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "react": { useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    "next/navigation": { useRouter: () => ({ push() {}, refresh() {} }) },
    "lucide-react": new Proxy({}, { get: (_, name) => name }),
    "sonner": { toast: { success() {}, error(message) { throw new Error(message) } } },
    "@/lib/admin/actions/goals": { updateGoal: async (...args) => submitted.push(args) },
    "@/components/admin/material-type-icon": { MaterialTypeIcon: "span", materialTypeLabel: {} },
  }
  for (const name of ["button", "input", "textarea", "checkbox", "field", "select", "card"]) {
    dependencies["@/components/ui/" + name] = new Proxy({}, { get: (_, key) => key })
  }
  const { GoalForm } = load("components/admin/goal-form.tsx", dependencies)
  const form = GoalForm({ courseId: "course", subjects: [{ id: "subject", name: "Disciplina" }], topicsBySubject: {}, materials: [],
    goal: { id: "goal", title: "Meta", description: "", status: "published", dueDate: null, updatedAt: input.updatedAt, items: input.items } })
  await form.props.onSubmit({ preventDefault() {} })
  assert.equal(submitted.length, 1)
  assert.equal(submitted[0][0], "goal")
  assert.equal(submitted[0][1].items[0].id, "stable-item")
  assert.equal(submitted[0][1].updatedAt, input.updatedAt)
})
