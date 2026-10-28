import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("textos legais estão preenchidos e não têm marcadores pendentes", () => {
  const content = read("lib/legal/content.ts")
  assert.doesNotMatch(content, /PREENCHER|TODO|XXX/)
  assert.match(content, /52\.992\.972\/0001-03/)
  assert.match(content, /Fortaleza\/CE/)
  assert.match(content, /60440-164/)
  assert.match(content, /cursoprofericklima@gmail\.com/)
  // Nunca mencionar grupos de estudo ao aluno.
  assert.doesNotMatch(content, /grupo\s*[123]|G[123]\b/i)
})

test("páginas legais são públicas e linkadas no login e na conta do aluno", () => {
  assert.match(read("app/privacidade/page.tsx"), /PRIVACY/)
  assert.match(read("app/termos/page.tsx"), /TERMS/)
  assert.match(read("app/auth/login/page.tsx"), /LegalLinks/)
  assert.match(read("app/aluno/conta/page.tsx"), /href="\/privacidade"/)
  // O proxy só protege /aluno e /admin: as páginas legais ficam abertas.
  const proxy = read("lib/supabase/proxy.ts")
  assert.doesNotMatch(proxy, /privacidade|termos/)
})

test("o aviso de privacidade cobre os dados e fornecedores reais", () => {
  const content = read("lib/legal/content.ts")
  for (const term of ["Hotmart", "Supabase", "Vercel", "Resend", "Estados Unidos", "15 dias", "ANPD", "90 dias", "5 anos"]) {
    assert.ok(content.includes(term), term)
  }
})
