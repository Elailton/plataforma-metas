import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {runInNewContext} from "node:vm"
import {createRequire} from "node:module"
import ts from "typescript"
import React from "react"
import {renderToStaticMarkup} from "react-dom/server"
import {formatDuration} from "../lib/mini-quizzes/core.mjs"
const require=createRequire(import.meta.url)
const code=ts.transpileModule(readFileSync(new URL('../components/mini-quizzes/ranking-card.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
const exports={}
runInNewContext(code,{exports,require(name){
 if(name==='next/link')return {default:({children,...props})=>React.createElement('a',props,children)}
 if(name==='@/lib/utils')return {cn:(...x)=>x.filter(Boolean).join(' ')}
 if(name==='@/lib/mini-quizzes/core.mjs')return {formatDuration}
 return require(name)
}})
const base={rank:1,display_name:'Aluna E.',correct_count:52,total_count:60,duration_seconds:600,is_me:false,participants:2}

test('ranking: comparação em verde e sinalização de nota parcial',()=>{
 const html=renderToStaticMarkup(React.createElement(exports.RankingCard,{rows:[{...base,combined_enabled:true,essay_status:'graded',essay_score:27,final_score:79,final_max:100,pending_count:1}]}))
 assert.match(html,/52\/60/);assert.match(html,/79/);assert.match(html,/100/)
 assert.match(html,/com redação/);assert.match(html,/text-success/);assert.match(html,/Ranking provisório/)
 const pending=renderToStaticMarkup(React.createElement(exports.RankingCard,{rows:[{...base,combined_enabled:true,essay_status:'pending',final_score:52,final_max:100,pending_count:1}]}))
 assert.match(pending,/redação em correção/);assert.match(pending,/parcial/);assert.doesNotMatch(pending,/com redação/)
 const legacy=renderToStaticMarkup(React.createElement(exports.RankingCard,{rows:[base]}))
 assert.match(legacy,/Mais acertos/);assert.doesNotMatch(legacy,/com redação|Ranking provisório/)
})
