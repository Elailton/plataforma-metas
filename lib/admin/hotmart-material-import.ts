import type { AdminMaterialType } from "@/lib/admin/types"

export interface ParsedHotmartMaterial {
  title: string
  type: AdminMaterialType
  url: string
  duration: string | null
}

export interface HotmartImportParseResult {
  rows: ParsedHotmartMaterial[]
  ignoredLines: number
}

function splitDelimitedLine(line: string, delimiter: string) {
  const values: string[] = []
  let value = ""
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === delimiter && !quoted) {
      values.push(value.trim())
      value = ""
    } else {
      value += character
    }
  }

  values.push(value.trim())
  return values
}

function isHotmartUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && (url.hostname === "hotmart.com" || url.hostname.endsWith(".hotmart.com"))
  } catch {
    return false
  }
}

function detectType(value: string, title: string): AdminMaterialType {
  const normalized = value.trim().toLowerCase()
  if (normalized === "apostila" || /apostila|pdf/i.test(title)) return "apostila"
  if (normalized === "link") return "link"
  return "videoaula"
}

export function parseHotmartMaterialList(raw: string): HotmartImportParseResult {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) return { rows: [], ignoredLines: 0 }

  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ";"
  const firstColumns = splitDelimitedLine(lines[0], delimiter).map((column) => column.toLowerCase())
  const hasHeader = firstColumns.includes("titulo") && firstColumns.includes("url")
  const header = hasHeader ? firstColumns : ["ordem", "tipo", "titulo", "duracao", "url"]
  const rows: ParsedHotmartMaterial[] = []
  const seenUrls = new Set<string>()
  let ignoredLines = 0

  for (const line of hasHeader ? lines.slice(1) : lines) {
    const columns = splitDelimitedLine(line, delimiter)
    const value = (name: string) => columns[header.indexOf(name)]?.trim() ?? ""
    const title = value("titulo")
    const url = value("url")

    if (!title || !isHotmartUrl(url)) {
      ignoredLines += 1
      continue
    }

    const normalizedUrl = new URL(url).toString()
    if (seenUrls.has(normalizedUrl)) {
      ignoredLines += 1
      continue
    }

    seenUrls.add(normalizedUrl)
    rows.push({
      title,
      type: detectType(value("tipo"), title),
      url: normalizedUrl,
      duration: /^\d{1,3}:\d{2}(?::\d{2})?$/.test(value("duracao")) ? value("duracao") : null,
    })
  }

  return { rows, ignoredLines }
}
