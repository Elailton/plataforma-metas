import assert from "node:assert/strict"
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { test } from "node:test"

// AI Memory: AGENTS.md + docs/ia/ precisam ficar íntegros para qualquer IA continuar o trabalho.
const root = resolve(import.meta.dirname, "..")
const memoryDir = join(root, "docs/ia")

function markdownFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return markdownFiles(path)
    return name.endsWith(".md") ? [path] : []
  })
}

const files = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md"]
  .map((name) => join(root, name))
  .concat(markdownFiles(memoryDir))

test("todo link relativo da memória aponta para um arquivo ou pasta existente", () => {
  const broken = []
  for (const file of files) {
    const text = readFileSync(file, "utf8")
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(target)) continue
      const path = resolve(dirname(file), target.split("#")[0])
      if (!existsSync(path)) broken.push(`${file.slice(root.length + 1)} -> ${target}`)
    }
  }
  assert.deepEqual(broken, [])
})

test("AGENTS.md aponta para o ponto de entrada da AI Memory", () => {
  const agents = readFileSync(join(root, "AGENTS.md"), "utf8")
  assert.match(agents.slice(0, 800), /docs\/ia\/00-comece-aqui\.md/)
  for (const required of ["00-comece-aqui.md", "01-regras.md", "14-fluxos-ponta-a-ponta.md", "15-padroes-tecnicos.md"]) {
    assert.ok(existsSync(join(memoryDir, required)), required)
  }
})

test("todo arquivo numerado de docs/ia está no índice README.md", () => {
  const index = readFileSync(join(memoryDir, "README.md"), "utf8")
  const numbered = readdirSync(memoryDir).filter((name) => /^\d{2}-.*\.md$/.test(name) || ["estado-atual.md", "sessoes.md"].includes(name))
  assert.deepEqual(numbered.filter((name) => !index.includes(`](${name})`)), [])
})

test("a memória não guarda segredos nem dados pessoais óbvios", () => {
  const patterns = [
    [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "JWT"],
    [/\b(sk|rk|re)_(live|test)?_?[A-Za-z0-9]{20,}/, "chave de API"],
    [/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, "CPF"],
    [/(SUPABASE_SERVICE_ROLE_KEY|HOTMART_HOTTOK|RESEND_API_KEY)\s*[=:]\s*["']?[A-Za-z0-9_\-.]{12,}/, "segredo com valor"],
  ]
  const allowedEmail = /@(example\.com|anthropic\.com|mentoria\.cursoprofericklima\.com\.br)$|^cursoprofericklima@gmail\.com$/
  const found = []
  for (const file of files) {
    const text = readFileSync(file, "utf8")
    for (const [pattern, label] of patterns) if (pattern.test(text)) found.push(`${label} em ${file.slice(root.length + 1)}`)
    for (const [email] of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g)) {
      if (!allowedEmail.test(email)) found.push(`e-mail ${email} em ${file.slice(root.length + 1)}`)
    }
  }
  assert.deepEqual(found, [])
})

test("pontes das ferramentas apontam para a fonte única", () => {
  for (const name of ["CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md"]) {
    assert.match(readFileSync(join(root, name), "utf8"), /AGENTS\.md/, name)
  }
})

test("arquivos de memória de curto e médio prazo têm data de revisão", () => {
  for (const name of ["00-comece-aqui.md", "estado-atual.md", "sessoes.md", "16-grupos-e-avaliacoes.md"]) {
    const text = readFileSync(join(memoryDir, name), "utf8")
    const match = text.match(/Revisado em: (\d{4}-\d{2}-\d{2})/)
    assert.ok(match, `${name} sem "Revisado em: AAAA-MM-DD"`)
    const days = (Date.now() - Date.parse(match[1])) / 86_400_000
    if (name === "estado-atual.md" && days > 14) console.warn(`AVISO: estado-atual.md revisado há ${Math.round(days)} dias`)
  }
})

test("a memória não tem caracteres invisíveis (texto escondido)", () => {
  const hidden = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u{E0000}-\u{E007F}]/u
  assert.deepEqual(files.filter((file) => hidden.test(readFileSync(file, "utf8"))).map((file) => file.slice(root.length + 1)), [])
})
