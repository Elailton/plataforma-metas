"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { logSafeServerError } from "@/lib/security/safe-error"
import { requireAdmin } from "@/lib/admin/auth"
import { isUuid } from "@/lib/mini-quizzes/core.mjs"
import { ESSAY_MAX_BODY, ESSAY_MAX_IMAGES, parseEssayScores } from "@/lib/mini-quizzes/essay.mjs"

export type EssayActionResult = { ok: true; submittedAt?: string } | { ok: false; error: string }

const MESSAGES: Record<string, string> = {
  ESSAY_ALREADY_SENT: "Você já enviou a redação deste simulado.",
  ESSAY_EMPTY: "Anexe a foto da folha ou digite o texto da redação.",
  ESSAY_TOO_LONG: "O texto ficou grande demais para enviar. Confira se colou algo além da redação.",
  ESSAY_TOO_MANY_IMAGES: `Envie no máximo ${ESSAY_MAX_IMAGES} fotos.`,
  ESSAY_IMAGE_INVALID: "Não foi possível conferir as fotos enviadas. Tente novamente.",
  ESSAY_NOT_ALLOWED: "Não é possível enviar redação para este simulado.",
  ESSAY_TOO_LATE: "O prazo para enviar a redação terminou: ela só pode ser enviada junto com as respostas.",
}

/** Envia a redação (fotos já no bucket + texto colado). Regras e dono da tentativa: decididos na RPC. */
export async function submitMiniQuizEssay(attemptId: string, body: string, imagePaths: string[]): Promise<EssayActionResult> {
  if (!isUuid(attemptId)) return { ok: false, error: MESSAGES.ESSAY_NOT_ALLOWED }
  const text = String(body ?? "").replace(/\r\n?/g, "\n").trim()
  if (text.length > ESSAY_MAX_BODY) return { ok: false, error: MESSAGES.ESSAY_TOO_LONG }
  const paths = (Array.isArray(imagePaths) ? imagePaths : []).filter((path) => typeof path === "string" && path.length < 300)
  if (paths.length > ESSAY_MAX_IMAGES) return { ok: false, error: MESSAGES.ESSAY_TOO_MANY_IMAGES }
  if (!text && paths.length === 0) return { ok: false, error: MESSAGES.ESSAY_EMPTY }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("submit_mini_quiz_essay", {
    p_attempt_id: attemptId,
    p_body: text || null,
    p_image_paths: paths,
  })
  if (error) {
    const code = Object.keys(MESSAGES).find((key) => error.message?.includes(key))
    if (!code) logSafeServerError("mini_quiz.essay_submit_failed", error)
    return { ok: false, error: code ? MESSAGES[code] : "Não foi possível enviar a redação. Tente novamente." }
  }
  revalidatePath(`/aluno/diagnostico-semanal/tentativas/${attemptId}`)
  revalidatePath("/aluno/relatorio")
  return { ok: true, submittedAt: (data as { submitted_at?: string } | null)?.submitted_at }
}

/** Resultado da correção informado pelo administrador. */
export async function gradeMiniQuizEssay(
  essayId: string,
  status: "pending" | "graded" | "annulled",
  scores: (string | number)[],
  feedback: string,
): Promise<EssayActionResult> {
  await requireAdmin()
  if (!isUuid(essayId)) return { ok: false, error: "Redação inválida." }
  if (!["pending", "graded", "annulled"].includes(status)) return { ok: false, error: "Situação inválida." }
  const parsed = status === "graded" ? parseEssayScores(scores) : null
  if (status === "graded" && !parsed) return { ok: false, error: "Informe as 4 notas, de 0 a 10 (números inteiros)." }
  const note = String(feedback ?? "").trim()
  if (note.length > 4000) return { ok: false, error: "O comentário está grande demais." }

  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_grade_mini_quiz_essay", {
    p_essay_id: essayId,
    p_status: status,
    p_scores: parsed,
    p_feedback: note || null,
  })
  if (error) {
    logSafeServerError("mini_quiz.essay_grade_failed", error)
    return { ok: false, error: "Não foi possível salvar o resultado." }
  }
  revalidatePath("/admin/mini-simulados/redacoes")
  return { ok: true }
}
