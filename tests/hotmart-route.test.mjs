import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import * as core from "../lib/hotmart/core.mjs"
import * as security from "../lib/hotmart/security.mjs"

test("POST real com HOTTOK inválido retorna 401 sem instanciar banco ou processar payload", async () => {
  let repositoryCalls = 0, payloadReads = 0
  const code = ts.transpileModule(readFileSync(new URL("../app/api/webhooks/hotmart/route.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  const dependencies = {
    "next/server": { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
    "@/lib/hotmart/core.mjs": core,
    "@/lib/hotmart/security.mjs": security,
    "@/lib/hotmart/supabase-repository": { createHotmartRepository: () => { repositoryCalls++; throw new Error("Must not call") } },
  }
  runInNewContext(code, { exports, process: { env: { HOTMART_HOTTOK: "test-only-token" } }, require: (name) => {
    if (!(name in dependencies)) throw new Error("Unexpected import " + name)
    return dependencies[name]
  } })
  for (const token of [null, "invalid", "test-only-token-extra"]) {
    const result = await exports.POST({ headers: { get: () => token }, json: async () => { payloadReads++; return {} } })
    assert.equal(result.status, 401)
  }
  assert.equal(repositoryCalls, 0)
  assert.equal(payloadReads, 0)
})
