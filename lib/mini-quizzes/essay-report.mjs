export const REPORT_BUCKET = "essay-feedback-reports"
export const REPORT_MAX_BYTES = 3 * 1024 * 1024

/** PDF somente, tamanho limitado; rejeita HTML renomeado antes do upload. */
export function validReportPdf(type, size, header) {
  return type === "application/pdf" && Number.isInteger(size) && size >= 5 && size <= REPORT_MAX_BYTES
    && header === "%PDF-"
}

export function reportPath(courseId, essayId, versionId) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (![courseId, essayId, versionId].every((id) => typeof id === "string" && uuid.test(id))) return null
  return `${courseId}/${essayId}/${versionId}.pdf`
}

export function reportHref(essayId) {
  return `/aluno/relatorio/redacoes/${essayId}`
}
