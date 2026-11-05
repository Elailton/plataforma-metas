// Formata o "texto associado" para leitura compacta: junta as linhas quebradas da prova em
// parágrafos, tira a numeração de linhas e separa título, parágrafos, versos e fonte.
// Regra pura, testável sem Next.js. Nada é alterado no banco.

const SOURCE = /(dispon[ií]vel\s*(em)?\s*:|^\(?\s*fonte\s*:|acesso em|https?:\/\/|www\.|^internet\s*:|\(com adapta[çc][õo]es\)|^adaptado de)/i
const LABEL = /^texto\s+([ivx]+|\d+|[a-z]{1,3}\d[a-z0-9-]*)\s*$/i
const LINE_NUMBER = /^\d{1,3}\s+(?=\S)/
const END = /[.!?:;…"”’)\]]$/

/** Parte da fonte (autor, obra, endereço), escrita depois do último parágrafo. */
const isSource = (line) => SOURCE.test(line)

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
}

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0
}

const joinLines = (lines) =>
  lines.reduce((text, line) => (text ? `${text} ${line}` : line), "").replace(/\s{2,}/g, " ").trim()

/**
 * @param {string} passage
 * @returns {{ kind: "label" | "title" | "paragraph" | "verse" | "source", text: string }[]}
 */
export function formatPassage(passage) {
  let lines = String(passage ?? "").replace(/\r\n?/g, "\n").replace(/ /g, " ").split("\n").map((line) => line.trim())

  // Numeração de linhas da prova ("01 A vacinação...", "5 Os pesquisadores...").
  const numbered = lines.filter((line) => LINE_NUMBER.test(line) && !/^\d{1,3}\s+(de|e|a|%|mil|anos?|dias?|horas?|vezes)\b/i.test(line))
  if (numbered.length >= 3) {
    const first = lines.findIndex((line) => LINE_NUMBER.test(line))
    lines = lines.map((line) => (LINE_NUMBER.test(line) ? line.replace(LINE_NUMBER, "") : line))
    // O que vem antes da primeira linha numerada (título) fica num bloco próprio.
    if (first > 0 && lines[first - 1]) lines.splice(first, 0, "")
  }

  // Blocos separados por linha em branco.
  const blocks = []
  let current = []
  for (const line of lines) {
    if (!line) {
      if (current.length) blocks.push(current)
      current = []
    } else current.push(line)
  }
  if (current.length) blocks.push(current)

  const lengths = lines.filter((line) => line && !isSource(line) && !LABEL.test(line)).map((line) => line.length)
  const width = percentile(lengths, 0.9)

  const out = []
  blocks.forEach((block) => {
    let rest = block
    // Rótulos ("Texto I", "Texto CB1A1") ficam numa linha própria.
    while (rest.length && LABEL.test(rest[0])) {
      out.push({ kind: "label", text: rest[0] })
      rest = rest.slice(1)
    }
    if (!rest.length) return
    const sourceStart = rest.every(isSource) ? 0 : rest.findIndex((line, index) => index > 0 && isSource(line) && END.test(rest[index - 1]))
    const sourceLines = sourceStart >= 0 ? rest.slice(sourceStart) : []
    const textLines = sourceLines.length ? rest.slice(0, rest.length - sourceLines.length) : rest

    if (textLines.length) {
      const blockMedian = median(textLines.map((line) => line.length))
      const wrapped = textLines.length >= 2 && blockMedian >= 35
      if (!wrapped && textLines.length >= 2) {
        // Versos ou lista curta: mantém as quebras.
        out.push({ kind: "verse", text: textLines.join("\n") })
      } else if (!wrapped) {
        out.push({ kind: "paragraph", text: textLines[0] })
      } else {
        // Linhas quebradas pela diagramação da prova: fecha o parágrafo na linha curta com pontuação final.
        let paragraph = []
        textLines.forEach((line, index) => {
          paragraph.push(line)
          const last = index === textLines.length - 1
          const short = line.length < width * 0.8
          if (last || (short && END.test(line))) {
            out.push({ kind: "paragraph", text: joinLines(paragraph) })
            paragraph = []
          }
        })
      }
    }
    if (sourceLines.length) out.push({ kind: "source", text: joinLines(sourceLines) })
  })

  // Título: primeiro parágrafo curto, sem ponto final, antes do texto.
  const firstText = out.findIndex((part) => part.kind === "paragraph")
  if (
    firstText >= 0 &&
    out.length > firstText + 1 &&
    out[firstText].text.length <= 120 &&
    !/[.!:;…]$/.test(out[firstText].text)
  ) {
    out[firstText] = { kind: "title", text: out[firstText].text }
  }
  return out
}
