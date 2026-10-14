// Leitura de mini simulados em Word (.docx), no navegador ou no Node, sem dependências.
//
// Modelo esperado (o mesmo dos arquivos de montagem do curso):
//   * título na primeira linha;
//   * textos de apoio antes da questão a que se referem;
//   * questões numeradas em sequência ("01.", "02." ...), alternativas "A)" a "E)";
//   * tabela final com cabeçalho QUESTÕES | GABARITOS | COMENTÁRIOS.
// Negrito e sublinhado parciais viram **negrito** e __sublinhado__. Imagens viram
// linhas [[imagem:<hash>]] na posição em que aparecem; o conteúdo vai em `images`.
// Imagens depois da última questão (rodapé, logotipo) são ignoradas.

const NUM_RE = /^\s*(\d{1,2})\s*[.)]\s*/
const ALT_RE = /^\s*\(?([A-E])\)\s*/
const MIME_BY_EXT = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" }

// ---------------------------------------------------------------- zip
async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Lê as entradas de um .zip (stored ou deflate). */
export async function unzip(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error("Arquivo .docx inválido.")
  const count = view.getUint16(eocd + 10, true)
  let offset = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const entries = new Map()
  for (let n = 0; n < count; n += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Arquivo .docx inválido.")
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
    entries.set(name, { method, compressedSize, localOffset })
    offset += 46 + nameLength + extraLength + commentLength
  }
  return {
    names: [...entries.keys()],
    async read(name) {
      const entry = entries.get(name)
      if (!entry) return null
      const start = entry.localOffset + 30 + view.getUint16(entry.localOffset + 26, true) + view.getUint16(entry.localOffset + 28, true)
      const data = bytes.subarray(start, start + entry.compressedSize)
      if (entry.method === 0) return data
      if (entry.method === 8) return inflateRaw(data)
      throw new Error("Compressão não suportada no .docx.")
    },
  }
}

// ---------------------------------------------------------------- xml
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }
function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, code) => {
    if (code[0] === "#") return String.fromCodePoint(code[1] === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10))
    return ENTITIES[code]
  })
}

/** Árvore mínima de XML: { name, attrs, children } e nós de texto { text }. */
export function parseXml(xml) {
  const root = { name: "#root", attrs: {}, children: [] }
  const stack = [root]
  const tag = /<(\/?)([^\s>/!?]+)([^>]*?)(\/?)>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<![^>]*>/g
  let last = 0
  let match
  while ((match = tag.exec(xml))) {
    if (match.index > last) {
      const text = xml.slice(last, match.index)
      stack[stack.length - 1].children.push({ text: decodeEntities(text) })
    }
    last = tag.lastIndex
    if (match[5] !== undefined) {
      stack[stack.length - 1].children.push({ text: match[5] })
      continue
    }
    if (!match[2]) continue
    if (match[1]) {
      if (stack.length > 1) stack.pop()
      continue
    }
    const attrs = {}
    const attrRe = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g
    let attr
    while ((attr = attrRe.exec(match[3]))) attrs[attr[1]] = decodeEntities(attr[3] ?? attr[4] ?? "")
    const node = { name: match[2], attrs, children: [] }
    stack[stack.length - 1].children.push(node)
    if (!match[4]) stack.push(node)
  }
  return root
}

const elements = (node, name) => (node.children ?? []).filter((child) => child.name === name)
const first = (node, name) => (node.children ?? []).find((child) => child.name === name)
function descendants(node, name, out = []) {
  for (const child of node.children ?? []) {
    if (child.name === name) out.push(child)
    descendants(child, name, out)
  }
  return out
}

// ---------------------------------------------------------------- texto
const OFF = new Set(["0", "false", "off"])
function onOff(rPr, name) {
  const node = rPr && first(rPr, name)
  if (!node) return false
  if (name === "w:u") return (node.attrs["w:val"] ?? "single") !== "none"
  return !OFF.has(node.attrs["w:val"] ?? "true")
}

function runText(run) {
  let text = ""
  for (const child of run.children ?? []) {
    if (child.name === "w:t") text += (child.children ?? []).map((part) => part.text ?? "").join("")
    else if (child.name === "w:tab" || child.name === "w:ptab") text += "\t"
    else if (child.name === "w:br") text += !child.attrs["w:type"] || child.attrs["w:type"] === "textWrapping" ? "\n" : ""
    else if (child.name === "w:cr") text += "\n"
    else if (child.name === "w:noBreakHyphen") text += "-"
  }
  return text
}

/** Runs diretas do parágrafo e de hiperlinks (mesma regra do python-docx). */
function paragraphRuns(paragraph) {
  const runs = []
  for (const child of paragraph.children ?? []) {
    const list = child.name === "w:r" ? [child] : child.name === "w:hyperlink" ? elements(child, "w:r") : []
    for (const run of list) {
      const rPr = first(run, "w:rPr")
      runs.push({ text: runText(run), bold: onOff(rPr, "w:b"), underline: onOff(rPr, "w:u") })
    }
  }
  return runs
}

export function cleanText(value) {
  return value.replace(/ /g, " ").replace(/[ \t]+/g, " ").trim()
}

function paragraphText(paragraph) {
  return paragraphRuns(paragraph).map((run) => run.text).join("")
}

function paragraphMarkup(paragraph) {
  const runs = paragraphRuns(paragraph)
  const text = runs.map((run) => run.text).join("")
  const nonBlank = runs.filter((run) => run.text.trim())
  if (nonBlank.length === 0) return { text, markup: text }
  const allBold = nonBlank.every((run) => run.bold)
  const allUnderline = nonBlank.every((run) => run.underline)
  let markup = ""
  for (const run of runs) {
    if (!run.text) continue
    const core = run.text.trim()
    if (!core) {
      markup += run.text
      continue
    }
    const lead = run.text.slice(0, run.text.length - run.text.trimStart().length)
    const trail = run.text.slice(run.text.trimEnd().length)
    let value = core
    if (run.underline && !allUnderline) value = `__${value}__`
    if (run.bold && !allBold) value = `**${value}**`
    markup += lead + value + trail
  }
  markup = markup.replace(/\*\*(\s*)\*\*/g, "$1").replace(/__(\s*)__/g, "$1")
  return { text, markup }
}

function cellText(cell) {
  return elements(cell, "w:p").map(paragraphText).join("\n")
}

function tableRows(table) {
  return elements(table, "w:tr").map((row) => elements(row, "w:tc"))
}

// ---------------------------------------------------------------- imagens
async function sha1Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-1", bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function toBase64(bytes) {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function flattenBody(body) {
  const out = []
  for (const child of body.children ?? []) {
    if (child.name === "w:sdt") {
      const content = first(child, "w:sdtContent")
      if (content) out.push(...flattenBody(content))
    } else if (child.name === "w:p" || child.name === "w:tbl") out.push(child)
  }
  return out
}

/**
 * Converte um .docx no formato de mini simulado.
 * Retorna { title, questions: [{ number, statement, alternatives, correctKey, explanation }], images, warnings }.
 */
export async function parseMiniQuizDocx(buffer) {
  const zip = await unzip(buffer)
  const documentXml = await zip.read("word/document.xml")
  if (!documentXml) throw new Error("O arquivo não parece ser um documento do Word.")
  const relsXml = await zip.read("word/_rels/document.xml.rels")
  const decoder = new TextDecoder()
  const relations = new Map()
  if (relsXml) {
    for (const rel of descendants(parseXml(decoder.decode(relsXml)), "Relationship")) {
      relations.set(rel.attrs.Id, rel.attrs.Target)
    }
  }
  const doc = parseXml(decoder.decode(documentXml))
  const body = descendants(doc, "w:body")[0]
  if (!body) throw new Error("Documento do Word sem conteúdo.")

  const imageCache = new Map()
  async function paragraphImages(paragraph) {
    const hashes = []
    for (const blip of descendants(paragraph, "a:blip")) {
      const target = relations.get(blip.attrs["r:embed"])
      if (!target) continue
      const path = target.startsWith("/") ? target.slice(1) : `word/${target.replace(/^\.\//, "")}`
      if (!imageCache.has(path)) {
        const data = await zip.read(path)
        if (!data) continue
        const ext = path.split(".").pop().toLowerCase()
        const hash = (await sha1Hex(data)).slice(0, 16)
        imageCache.set(path, { hash, mime: MIME_BY_EXT[ext] ?? null, data })
      }
      hashes.push(imageCache.get(path))
    }
    return hashes
  }

  const blocks = []
  for (const node of flattenBody(body)) {
    if (node.name === "w:tbl") {
      blocks.push({ type: "table", node })
    } else {
      const { text, markup } = paragraphMarkup(node)
      blocks.push({ type: "p", text: cleanText(text), markup: cleanText(markup), images: await paragraphImages(node) })
    }
  }

  const isAnswerTable = (table) => {
    const header = (tableRows(table)[0] ?? []).map(cellText).join(" ").toUpperCase()
    return header.includes("GABARITO")
  }

  const answers = new Map()
  for (const block of blocks) {
    if (block.type !== "table" || !isAnswerTable(block.node)) continue
    for (const cells of tableRows(block.node).slice(1)) {
      const number = /^\s*(\d+)/.exec(cellText(cells[0] ?? { children: [] }))
      if (!number || cells.length < 2) continue
      const key = cleanText(cellText(cells[1])).toUpperCase().slice(0, 1)
      const comment = cells[2]
        ? elements(cells[2], "w:p").map((p) => cleanText(paragraphText(p))).join("\n").replace(/\n{3,}/g, "\n\n").trim()
        : ""
      answers.set(Number(number[1]), { key, comment })
    }
  }

  const warnings = []
  const questions = []
  const usedImages = new Map()
  let current = null
  let expect = 1
  let title = null
  let pending = []
  let pendingImages = []
  const marker = (image) => `[[imagem:${image.hash}]]`

  for (const block of blocks) {
    if (block.type === "table") {
      if (current && !isAnswerTable(block.node)) {
        const rows = tableRows(block.node).map((cells) => cells.map((cell) => cleanText(cellText(cell))).join(" | "))
        ;(current.alternatives.length ? pending : current.statement).push(rows.join("\n"))
      }
      continue
    }
    const { text, markup, images } = block
    const number = NUM_RE.exec(text)
    if (number && Number(number[1]) === expect && (!current || current.alternatives.length)) {
      if (current) questions.push(current)
      const firstLine = markup.replace(/^\s*\**\s*\d{1,2}\s*[.)]\s*(\*\*)?/, "").trim()
      current = { number: expect, statement: [...pending, firstLine], alternatives: [], images: [...pendingImages] }
      pending = []
      pendingImages = []
      expect += 1
      for (const image of images) {
        current.images.push(image)
        current.statement.push(marker(image))
      }
      continue
    }
    if (!current) {
      if (text && title === null) {
        title = text
        continue
      }
      for (const image of images) pending.push(marker(image))
      pendingImages.push(...images)
      if (text) pending.push(markup)
      else if (pending.length) pending.push("")
      continue
    }
    const alternative = ALT_RE.exec(text)
    const last = current.alternatives[current.alternatives.length - 1]
    if (alternative && ((!last && alternative[1] === "A") || (last && alternative[1].charCodeAt(0) === last.key.charCodeAt(0) + 1))) {
      current.alternatives.push({ key: alternative[1], text: markup.replace(ALT_RE, "").trim() })
      current.images.push(...images)
      continue
    }
    if (current.alternatives.length) {
      pendingImages.push(...images)
      for (const image of images) pending.push(marker(image))
      if (text) pending.push(markup)
      else if (pending.length) pending.push("")
      continue
    }
    for (const image of images) {
      current.images.push(image)
      current.statement.push(marker(image))
    }
    current.statement.push(text ? markup : "")
  }
  if (current) questions.push(current)

  const result = questions.map((question) => {
    const answer = answers.get(question.number)
    if (!answer) warnings.push(`Questão ${question.number} sem gabarito.`)
    if (question.alternatives.length < 2) warnings.push(`Questão ${question.number} com menos de duas alternativas.`)
    if (answer && !question.alternatives.some((item) => item.key === answer.key)) {
      warnings.push(`Questão ${question.number}: gabarito ${answer.key || "vazio"} não corresponde a nenhuma alternativa.`)
    }
    for (const image of question.images) usedImages.set(image.hash, image)
    return {
      number: question.number,
      statement: question.statement.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
      alternatives: question.alternatives.map((item) => ({ key: item.key, text: item.text.trim() })),
      correctKey: answer?.key ?? "",
      explanation: answer?.comment ?? "",
    }
  })
  if (questions.length === 0) warnings.push("Nenhuma questão numerada foi encontrada.")
  if (answers.size !== questions.length) warnings.push(`O gabarito tem ${answers.size} linhas e há ${questions.length} questões.`)
  for (const image of usedImages.values()) {
    if (!image.mime) warnings.push("Há uma imagem em formato não suportado (use PNG, JPG ou GIF).")
  }

  return {
    title,
    questions: result,
    images: [...usedImages.values()]
      .filter((image) => image.mime)
      .map((image) => ({ hash: image.hash, mime: image.mime, base64: toBase64(image.data), size: image.data.length })),
    warnings,
  }
}

/** Título sugerido a partir do nome do arquivo: sem extensão e sem o prefixo "Disciplina - ". */
export function titleFromFilename(filename) {
  const base = String(filename ?? "").split(/[\\/]/).pop().replace(/\.docx$/i, "").replace(/\s+/g, " ").trim()
  const parts = base.split(" - ")
  return (parts.length > 1 ? parts.slice(1).join(" - ") : base).slice(0, 300)
}
