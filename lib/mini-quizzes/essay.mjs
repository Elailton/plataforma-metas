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
// Limite interno do texto colado/digitado (~100 linhas manuscritas); não é mostrado ao aluno.
export const ESSAY_MAX_BODY = 12000
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

/**
 * Nota geral do simulado, como no edital: cada questão objetiva vale 1 ponto e a redação soma até
 * ESSAY_MAX_SCORE pontos (PMPE: 60 + 40 = 100). Redação pendente, anulada ou não enviada soma 0.
 */
export function combinedScore(attempt, essay) {
  const objective = Math.max(0, Math.floor(Number(attempt?.correct_count) || 0))
  const objectiveMax = Math.max(0, Math.floor(Number(attempt?.total_count) || 0))
  const status = essay ? essay.status : "none"
  const essayPoints = status === "graded" ? Math.max(0, Math.min(ESSAY_MAX_SCORE, Math.floor(Number(essay.score_total) || 0))) : 0
  return { objective, objectiveMax, essayPoints, essayMax: ESSAY_MAX_SCORE, status, total: objective + essayPoints, max: objectiveMax + ESSAY_MAX_SCORE }
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

/** Linha "[[folha:/folhas-redacao/arquivo.pdf]]" na proposta: folha de redação para baixar. */
const SHEET_LINE = /^\[\[folha:(\/folhas-redacao\/[a-z0-9-]+\.pdf)\]\]$/i

/** Separa da proposta a folha para baixar (marcador) e o texto exibido ao aluno. */
export function parseEssayPrompt(prompt) {
  const lines = String(prompt ?? "").replace(/\r\n?/g, "\n").split("\n")
  let sheetUrl = null
  const kept = []
  for (const line of lines) {
    const match = line.trim().match(SHEET_LINE)
    if (match) {
      sheetUrl = sheetUrl ?? match[1]
      continue
    }
    kept.push(line)
  }
  return { text: kept.join("\n").trim(), sheetUrl }
}

/** Rascunho da redação digitada durante a prova (guardado só no navegador do aluno). */
export function essayDraftKey(quizId) {
  return `sga:redacao:${quizId}`
}
