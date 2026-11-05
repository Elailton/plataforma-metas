// Separa o "texto associado" (texto-base de prova) do comando da questão, para o aluno
// recolher e expandir o texto. Regra pura, testável sem Next.js.
//
// Formato do enunciado:
//   **Texto associado**
//   <texto-base>
//   [[/texto]]          <- marcador opcional do fim do texto (prioritário)
//   <comando da questão>
//
// Sem marcador: o texto termina na última linha de fonte ("Disponível", "Fonte:", "Acesso em",
// endereço http...). Se não houver fonte, o comando é o último parágrafo.

const HEADER = /^\s*\*\*texto associado\*\*\s*$/i
export const PASSAGE_END_LINE = /^\[\[\/texto\]\]$/i
const SOURCE_LINE = /(dispon[ií]vel\s*(em)?\s*:|^\(?\s*fonte\s*:|acesso em|https?:\/\/|www\.)/i

const trimBlankEdges = (lines) => {
  let start = 0
  let end = lines.length
  while (start < end && !lines[start].trim()) start += 1
  while (end > start && !lines[end - 1].trim()) end -= 1
  return lines.slice(start, end)
}

/** @param {string} statement @returns {{ passage: string | null, body: string }} */
export function splitStatement(statement) {
  const text = String(statement ?? "").replace(/\r\n?/g, "\n")
  const lines = text.split("\n")
  const first = lines.findIndex((line) => line.trim())
  if (first < 0 || !HEADER.test(lines[first])) return { passage: null, body: text }

  const rest = lines.slice(first + 1)
  const marker = rest.findIndex((line) => PASSAGE_END_LINE.test(line.trim()))
  let cut = -1
  if (marker >= 0) {
    const passage = trimBlankEdges(rest.slice(0, marker))
    const body = trimBlankEdges(rest.slice(marker + 1))
    if (passage.length && body.length) return { passage: passage.join("\n"), body: body.join("\n") }
    return { passage: null, body: [...passage, ...body].join("\n") }
  }

  // Última linha de fonte que ainda deixa algum comando depois dela.
  for (let i = rest.length - 1; i >= 0; i -= 1) {
    if (SOURCE_LINE.test(rest[i]) && rest.slice(i + 1).some((line) => line.trim())) {
      cut = i + 1
      break
    }
  }
  if (cut < 0) {
    // Sem fonte: o comando é o último parágrafo (bloco separado por linha em branco).
    const trimmed = trimBlankEdges(rest)
    let lastBlank = -1
    for (let i = trimmed.length - 1; i >= 0; i -= 1) {
      if (!trimmed[i].trim()) {
        lastBlank = i
        break
      }
    }
    if (lastBlank < 0) return { passage: null, body: trimmed.join("\n") }
    const passage = trimBlankEdges(trimmed.slice(0, lastBlank))
    const body = trimBlankEdges(trimmed.slice(lastBlank + 1))
    if (!passage.length || !body.length) return { passage: null, body: trimmed.join("\n") }
    return { passage: passage.join("\n"), body: body.join("\n") }
  }
  const passage = trimBlankEdges(rest.slice(0, cut))
  const body = trimBlankEdges(rest.slice(cut))
  return { passage: passage.join("\n"), body: body.join("\n") }
}
