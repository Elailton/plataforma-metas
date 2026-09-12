import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"

function loadParser() {
  const source = readFileSync(new URL("../lib/admin/hotmart-material-import.ts", import.meta.url), "utf8")
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  runInNewContext(code, { exports, URL })
  return exports.parseHotmartMaterialList
}

const parse = loadParser()

test("lê o CSV extraído e detecta apostila e videoaula", () => {
  const result = parse([
    "ordem;tipo;titulo;duracao;url",
    "1;apostila;Apostila em PDF;;https://hotmart.com/pt-BR/club/course/content/pdf",
    "2;videoaula;Interpretação de Texto;30:03;https://hotmart.com/pt-BR/club/course/content/video",
  ].join("\n"))

  assert.equal(result.rows.length, 2)
  assert.equal(result.rows[0].type, "apostila")
  assert.equal(result.rows[1].duration, "30:03")
})

test("ignora domínios externos, linhas inválidas e links repetidos", () => {
  const result = parse([
    "ordem;tipo;titulo;duracao;url",
    "1;videoaula;Aula;10:00;https://hotmart.com/content/1",
    "2;videoaula;Aula repetida;10:00;https://hotmart.com/content/1",
    "3;videoaula;Site externo;10:00;https://example.com/content/2",
    "linha quebrada",
  ].join("\n"))

  assert.equal(result.rows.length, 1)
  assert.equal(result.ignoredLines, 3)
})

test("aceita valores entre aspas e arquivos separados por tabulação", () => {
  const result = parse([
    "ordem\ttipo\ttitulo\tduracao\turl",
    "1\tvideoaula\t\"Aula; especial\"\t01:02:03\thttps://consumer.hotmart.com/content/1",
  ].join("\n"))

  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0].title, "Aula; especial")
  assert.equal(result.rows[0].duration, "01:02:03")
})
