// Redação opcional do Simulado Geral: regras puras (sem Next.js nem Supabase).

/** Critérios da prova discursiva (edital PMPE/AOCP): até 10 pontos cada, 40 no total. */
export const ESSAY_CRITERIA = [
  "Tema, informatividade e argumentação",
  "Coesão e coerência",
  "Estrutura dissertativo-argumentativa e paragrafação",
  "Norma-padrão (pontuação, ortografia, concordância, regência e colocação)",
]
export const ESSAY_MAX_SCORE = 40
export const ESSAY_MIN_SCORE = 12
export const ESSAY_REVIEW_DAYS = 7
export const ESSAY_MAX_IMAGES = 3
export const ESSAY_MAX_BODY = 6000
export const ESSAY_MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** Data-limite da correção: envio + 7 dias. */
export function essayReviewDeadline(submittedAt) {
  const base = new Date(submittedAt)
  if (Number.isNaN(base.getTime())) return null
  return new Date(base.getTime() + ESSAY_REVIEW_DAYS * 24 * 60 * 60 * 1000)
}

/** Situação mostrada ao aluno. */
export function essayStatusLabel(essay) {
  if (!essay) return null
  if (essay.status === "graded") return `Nota ${essay.score_total ?? 0}/${ESSAY_MAX_SCORE}`
  if (essay.status === "annulled") return "Redação anulada"
  return "Aguardando correção"
}

/** Tempo restante da prova (segundos; negativo = tempo esgotado). */
export function remainingSeconds(limitMinutes, elapsed) {
  if (!limitMinutes || limitMinutes <= 0) return null
  return limitMinutes * 60 - Math.max(0, Math.floor(elapsed))
}

/** Notas de 0 a 10 nos 4 critérios; devolve null se alguma for inválida. */
export function parseEssayScores(values) {
  if (!Array.isArray(values) || values.length !== ESSAY_CRITERIA.length) return null
  const scores = values.map((value) => {
    if (typeof value === "number") return value
    const text = String(value ?? "").trim().replace(",", ".")
    return text === "" ? Number.NaN : Number(text)
  })
  if (scores.some((score) => !Number.isInteger(score) || score < 0 || score > 10)) return null
  return scores
}

/** Caminho da foto no bucket: <aluno>/<tentativa>/<n>-<id>.<ext>. */
export function essayImagePath(userId, attemptId, index, id, mime) {
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/heic" || mime === "image/heif" ? "heic" : "jpg"
  return `${userId}/${attemptId}/${index + 1}-${id}.${ext}`
}
