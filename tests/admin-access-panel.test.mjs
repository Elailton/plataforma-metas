import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync, existsSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

// Render the real table and existing UI components; only Next server-action
// and navigation boundaries are mocked. No production data or network.
const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL("../", import.meta.url))
const modules = new Map()
function load(path) {
  if (modules.has(path)) return modules.get(path)
  const exports = {}
  modules.set(path, exports)
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  runInNewContext(code, { exports, require: (name) => {
    if (name === "next/navigation") return { useRouter: () => ({ refresh() {} }) }
    if (name === "@/lib/admin/actions/enrollments") return {}
    if (name.startsWith("@/")) {
      const stem = resolve(root, name.slice(2))
      const file = [stem + ".tsx", stem + ".ts"].find(existsSync)
      if (!file) throw new Error("Unexpected module: " + name)
      return load(file)
    }
    return require(name)
  } })
  return exports
}
const { CourseStudentsTable } = load(resolve(root, "components/admin/course-students-table.tsx"))
const student = {
  id: "enrollment", userId: "student", fullName: "Aluno teste", avatarInitials: "AT",
  email: "", courseId: "course", enrolledAt: "2026-09-04T12:00:00Z",
  enrollmentStatus: "active", manualStatus: null, hotmartActiveCount: 1,
  hotmartSuspendedCount: 0, hotmartRevokedCount: 0, accessBlock: null,
}
const render = (row) => renderToStaticMarkup(React.createElement(CourseStudentsTable, { courseId: "course", students: [row] }))

test("painel separa compra ativa, concessão ausente e botão de bloqueio", () => {
  const html = render(student)
  assert.match(html, /Acesso efetivo/)
  assert.match(html, /Compras Hotmart/)
  assert.match(html, /Concessão manual/)
  assert.match(html, /value="none"[^>]*selected/)
  assert.match(html, /Bloquear neste curso/)
  assert.doesNotMatch(html, /Acesso removido do aplicativo/)
})

test("painel mostra bloqueio, mantém concessão independente e escapa motivo", () => {
  const html = render({ ...student, enrollmentStatus: "suspended", manualStatus: "active",
    accessBlock: { reason: "<script>privado</script>", blockedByName: "Admin teste", blockedAt: "2026-09-04T12:00:00Z" },
  })
  assert.match(html, /Bloqueado pelo admin/)
  assert.match(html, /Desbloquear/)
  assert.match(html, /value="active"[^>]*selected/)
  assert.match(html, /&lt;script&gt;privado&lt;\/script&gt;/)
  assert.match(html, /Admin teste/)
})
