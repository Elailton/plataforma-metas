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
function setup({admin=true,status="graded",uploadError=null,publishError=null,context=null,analysis={essays:[],reports:[]}}={}){
 const calls=[]
 const query={select(){return this},eq(){return this},async maybeSingle(){return {data:{id:E,course_id:C,status}}}}
 const supabase={from:()=>query,storage:{from:()=>({async upload(path,file,options){calls.push({kind:"upload",path,size:file.size,options});return {error:uploadError}}})},async rpc(name,payload){calls.push({kind:"rpc",name,payload});return {error:publishError}}}
 const actions=load("lib/mini-quizzes/essay-report-actions.ts",{
  "@/lib/mini-quizzes/essay-reports":{getEssayAnalysisData:async()=>analysis},
  "node:crypto":{randomUUID:()=>V},"next/cache":{revalidatePath:path=>calls.push({kind:"refresh",path})},
  "@/lib/admin/auth":{requireAdmin:async()=>{if(!admin)throw Error("Acesso negado");return {supabase}}},
  "@/lib/student/queries":{getStudentContext:async()=>context},"@/lib/student/experience":{requireStudentFeature:async()=>{}},
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


test("leitura da cópia usa RPC própria e não consome o lembrete original",async()=>{
 const path=`${C}/${E}/${V}.pdf`
 const context={currentCourse:{id:C},profile:{id:V}}
 const analysis={essays:[{id:E,isTestCopy:true}],reports:[{essay_id:E,storage_path:path}]}
 const {actions,calls}=setup({context,analysis})
 await actions.viewEssayReport(E,path)
 assert.equal(calls[0].name,"student_view_essay_report_test_copy")
 assert.equal(calls[0].payload.p_copy_id,E)
 const noMatch=setup({context,analysis})
 await noMatch.actions.viewEssayReport(E,"caminho-antigo")
 assert.equal(noMatch.calls.length,0)
})

test("download real: cópia autorizada usa Storage privado; IDs sem entrega recebem 404",async()=>{
 const path=`${C}/${E}/${V}.pdf`
 const requests=[]
 function route({session=true,enabled=true,report=true}={}){
  return load("app/api/student/essay-reports/[essayId]/route.ts",{
   "@/lib/student/queries":{getStudentContext:async()=>session?{currentCourse:{id:C},profile:{id:V}}:null},
   "@/lib/student/experience":{getStudentExperience:async()=>({isEnabled:()=>enabled})},
   "@/lib/supabase/server":{createClient:async()=>({storage:{from(bucket){return {async download(key){requests.push({bucket,key});return {data:new Blob(["%PDF-1.7"]),error:null}}}}}})},
   "@/lib/mini-quizzes/core.mjs":{isUuid},
   "@/lib/mini-quizzes/essay-reports":{getEssayAnalysisData:async()=>({reports:report?[{essay_id:E,storage_path:path}]:[]})},
   "@/lib/mini-quizzes/essay-report.mjs":pdfRules,
   "@/lib/security/safe-error":{logSafeServerError:()=>{}},
  })
 }
 const ok=await route().GET(new Request("https://example.com"),{params:Promise.resolve({essayId:E})})
 assert.equal(ok.status,200)
 assert.match(ok.headers.get("content-disposition"),/^attachment/)
 assert.equal(ok.headers.get("cache-control"),"private, no-store")
 assert.equal(requests[0].bucket,pdfRules.REPORT_BUCKET)
 assert.equal(requests[0].key,path)
 for(const options of [{session:false},{enabled:false},{report:false}]){
  const denied=await route(options).GET(new Request("https://example.com"),{params:Promise.resolve({essayId:E})})
  assert.equal(denied.status,404)
 }
 assert.equal(requests.length,1)
})
