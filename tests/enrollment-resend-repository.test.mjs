import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import { deliverResend } from "../lib/auth/resend-access.mjs"

function repository({ role = "student", enrolled = true, published = true, blocked = false } = {}) {
  const reads = []
  const admin = {
    async rpc(name) { assert.equal(name,"find_auth_user_id_by_email"); return {data:"student",error:null} },
    from(table) {
      reads.push(table)
      const result = { data: table === "profiles" ? {role} : table === "enrollments"
        ? enrolled ? [{course_id:"course",study_group:null,courses:{status:published ? "published" : "draft"}}] : []
        : blocked ? [{course_id:"course"}] : [], error:null }
      const query = {select(){return this},eq(){return this},is(){return this},in(){return this},maybeSingle(){return Promise.resolve(result)},then(resolve,reject){return Promise.resolve(result).then(resolve,reject)}}
      return query
    },
  }
  const source = readFileSync(new URL("../lib/auth/resend-access-repository.ts",import.meta.url),"utf8")
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
  const module = {exports:{}}
  const imports = {
    "server-only":{},"node:crypto":{createHmac(){},randomUUID(){}},
    "@/lib/auth/invite-url":{inviteRedirectUrl(){}},
    "@/lib/supabase/admin":{createAdminClient:()=>admin},
  }
  runInNewContext(js,{exports:module.exports,process:{env:{SUPABASE_SERVICE_ROLE_KEY:"test"}},require(name){
    assert.ok(name in imports,`Unexpected dependency: ${name}`)
    return imports[name]
  }})
  return {deps:module.exports.createResendAccessDependencies(),reads}
}

test("reenvio real: aluno matriculado sem grupo recebe; ausência, bloqueio, rascunho e admin não recebem",async()=>{
  for (const [options,expected] of [[{},true],[{enrolled:false},false],[{blocked:true},false],[{published:false},false],[{role:"admin"},false]]) {
    const {deps,reads}=repository(options)
    let sent=0
    deps.sendAccessEmail=async()=>{sent++}
    deps.updateOutcome=async()=>{}
    assert.equal(await deliverResend({email:"student@test.invalid",requestId:1},deps),expected ? "sent" : "skipped")
    assert.equal(sent,expected ? 1 : 0)
    assert.ok(reads.every(table=>["profiles","enrollments","course_access_blocks"].includes(table)))
  }
})
