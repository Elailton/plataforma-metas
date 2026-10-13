// Regras puras dos PDFs guardados na plataforma (sem Next.js nem Supabase).
export const PDF_BUCKET = "materiais"
export const MAX_PDF_BYTES = 25 * 1024 * 1024
export const MAX_PDFS_PER_UPLOAD = 100

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const UUID_RE = new RegExp(`^${UUID}$`)
const PATH_RE = new RegExp(`^(${UUID})/(${UUID})\\.pdf$`)
const ROUTE_RE = new RegExp(`^/api/materiais/(${UUID})$`)

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value)
}

/** Caminho do objeto no bucket: <course_id>/<material_id>.pdf */
export function buildPdfStoragePath(courseId, materialId) {
  if (!isUuid(courseId) || !isUuid(materialId)) throw new Error("Identificadores inválidos para o arquivo.")
  return `${courseId}/${materialId}.pdf`
}

/** Confere formato e que o arquivo pertence ao curso e ao material informados. */
export function parsePdfStoragePath(path, courseId) {
  if (typeof path !== "string") return null
  const match = PATH_RE.exec(path)
  if (!match) return null
  if (courseId !== undefined && match[1] !== courseId) return null
  return { courseId: match[1], materialId: match[2] }
}

/** Endereço interno que o aluno abre; nunca expõe o caminho do bucket. */
export function materialFileRoute(materialId) {
  if (!isUuid(materialId)) throw new Error("Material inválido.")
  return `/api/materiais/${materialId}`
}

export function isMaterialFileRoute(url) {
  return typeof url === "string" && ROUTE_RE.test(url.trim())
}

/** Título sugerido a partir do nome do arquivo: sem extensão e sem espaços repetidos. */
export function titleFromPdfFilename(filename) {
  const base = String(filename ?? "")
    .split(/[\\/]/)
    .pop()
    .replace(/\.pdf$/i, "")
    .replace(/[_\s]+/g, " ")
    .trim()
  return base.slice(0, 300)
}

/** Valida um arquivo escolhido antes do envio. Retorna a mensagem de erro ou null. */
export function validatePdfFile(file) {
  if (!file || typeof file.name !== "string") return "Arquivo inválido."
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name)
  if (!isPdf) return `"${file.name}" não é um PDF.`
  if (!(file.size > 0)) return `"${file.name}" está vazio.`
  if (file.size > MAX_PDF_BYTES) return `"${file.name}" passa de 25 MB.`
  return null
}
