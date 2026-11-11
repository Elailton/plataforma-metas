import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import * as pdfRules from "../lib/mini-quizzes/essay-report.mjs"
import { isUuid } from "../lib/mini-quizzes/core.mjs"

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`
const E=id(20), C=id(10), V=id(50)
function load(file,imports){
 const source=readFileSync(new URL(`../${file}`,import.meta.url),"utf8")
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const exports={}
 runInNewContext(code,{exports,File,FormData,Response,require(name){assert.ok(name in imports,`Unexpected import ${name}`);return imports[name]}})
 return exports
}
function setup({admin=true,status="graded",uploadError=null,publishError=null}={}){
 const calls=[]
 const query={select(){return this},eq(){return this},async maybeSingle(){return {data:{id:E,course_id:C,status}}}}
 const supabase={from:()=>query,storage:{from:()=>({async upload(path,file,options){calls.push({kind:"upload",path,size:file.size,options});return {error:uploadError}}})},async rpc(name,payload){calls.push({kind:"rpc",name,payload});return {error:publishError}}}
 const actions=load("lib/mini-quizzes/essay-report-actions.ts",{
  "node:crypto":{randomUUID:()=>V},"next/cache":{revalidatePath:path=>calls.push({kind:"refresh",path})},
  "@/lib/admin/auth":{requireAdmin:async()=>{if(!admin)throw Error("Acesso negado");return {supabase}}},
  "@/lib/student/queries":{getStudentContext:async()=>null},"@/lib/student/experience":{requireStudentFeature:async()=>{}},
  "@/lib/supabase/server":{createClient:async()=>supabase},"@/lib/mini-quizzes/core.mjs":{isUuid},
  "@/lib/mini-quizzes/essay-report.mjs":pdfRules,"@/lib/security/safe-error":{logSafeServerError:()=>{}},
 })
 return {actions,calls}
}
function form(contents="%PDF-1.7\n",type="application/pdf"){
 const data=new FormData()
 data.set("essayId",E);data.set("targetGroup","1");data.set("expectedPath","")
 data.set("pdf",new File([contents],"nome-privado.pdf",{type}))
 return data
}

test("action real: publica após upload, sem nome pessoal e sem alterar a nota",async()=>{
 const {actions,calls}=setup()
 assert.equal((await actions.publishEssayReport(form())).ok,true)
 assert.deepEqual(calls.map(x=>x.kind),["upload","rpc","refresh","refresh"])
 assert.equal(calls[0].path,`${C}/${E}/${V}.pdf`)
 assert.equal(calls[1].name,"admin_publish_essay_report")
 assert.equal(calls[1].payload.p_essay_id,E)
 assert.equal(calls[1].payload.p_target_groups[0],1)
 assert.equal(calls[1].payload.p_expected_path,null)
 assert.equal(JSON.stringify(calls).includes("nome-privado"),false)
})

test("action real: recusa aluno, arquivo disfarçado, excesso de tamanho e nota pendente",async()=>{
 const denied=setup({admin:false})
 await assert.rejects(denied.actions.publishEssayReport(form()),/Acesso negado/)
 assert.equal(denied.calls.length,0)
 for(const [data,options] of [
  [form("<html>bad</html>"),{}],
  [form("%PDF-1.7","text/html"),{}],
  [form("%PDF-"+"a".repeat(pdfRules.REPORT_MAX_BYTES)),{}],
  [form(),{status:"pending"}],
 ]){
  const {actions,calls}=setup(options)
  assert.equal((await actions.publishEssayReport(data)).ok,false)
  assert.equal(calls.length,0)
 }
})

test("action real: falhas não publicam sucesso, não notificam nem apagam arquivos",async()=>{
 const failedUpload=setup({uploadError:{code:"failed"}})
 assert.equal((await failedUpload.actions.publishEssayReport(form())).ok,false)
 assert.deepEqual(failedUpload.calls.map(x=>x.kind),["upload"])
 const conflict=setup({publishError:{message:"REPORT_CONFLICT"}})
 const result=await conflict.actions.publishEssayReport(form())
 assert.equal(result.ok,false)
 assert.match(result.error,/outra janela/)
 assert.deepEqual(conflict.calls.map(x=>x.kind),["upload","rpc"])
})
