import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import * as confirmation from "../lib/auth/confirm.mjs"
import * as resend from "../lib/auth/resend-access.mjs"

function form(email,code,verify) {
  const state=[email,code,false,null]
  let cursor=0
  const nodes=[]
  const redirects=[]
  const module={exports:{}}
  const jsx=(type,props)=>{const node={type,props};nodes.push(node);return node}
  const imports={
    "react":{useState(){const index=cursor++;return [state[index],value=>{state[index]=value}]}},
    "react/jsx-runtime":{jsx,jsxs:jsx},
    "@/components/ui/button":{Button:"button"},"@/components/ui/input":{Input:"input"},"@/components/ui/label":{Label:"label"},
    "@/lib/supabase/client":{createClient:()=>({auth:{verifyOtp:verify}})},
    "@/lib/auth/confirm.mjs":confirmation,"@/lib/auth/resend-access.mjs":resend,
  }
  const source=readFileSync(new URL("../components/auth/access-code-form.tsx",import.meta.url),"utf8")
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
  runInNewContext(js,{exports:module.exports,require(name){assert.ok(name in imports);return imports[name]},window:{location:{assign:path=>redirects.push(path)}}})
  module.exports.AccessCodeForm()
  return {state,redirects,submit:()=>nodes.find(node=>node.type==="form").props.onSubmit({preventDefault(){}})}
}

test("código: e-mail inválido mostra aviso sem consulta; falha de rede libera o botão",async()=>{
  const invalid=form("invalido","123456",async()=>assert.fail("must not query"))
  await invalid.submit()
  assert.match(invalid.state[3],/e-mail válido/)
  const network=form("student@test.invalid","123456",async()=>{throw new Error("network")})
  await network.submit()
  assert.equal(network.state[2],false)
  assert.match(network.state[3],/conexão/)
})
test("código: confirma apenas recovery/invite; 429 interrompe e sucesso vai ao primeiro acesso",async()=>{
  const calls=[]
  const valid=form(" Student@test.invalid ","123456",async input=>{calls.push(input);return {error:input.type==="invite" ? null : {status:400}}})
  await valid.submit()
  assert.deepEqual(calls.map(c=>c.type),["recovery","invite"])
  assert.equal(calls[0].email,"student@test.invalid")
  assert.deepEqual(valid.redirects,["/auth/primeiro-acesso"])
  let attempts=0
  const limited=form("student@test.invalid","123456",async()=>{attempts++;return {error:{status:429}}})
  await limited.submit()
  assert.equal(attempts,1)
  assert.equal(limited.state[2],false)
  assert.match(limited.state[3],/Muitas tentativas/)
})
