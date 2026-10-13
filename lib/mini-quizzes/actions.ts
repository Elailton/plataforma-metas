"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { logSafeServerError } from "@/lib/security/safe-error"
import { normalizeAnswers, parseCooldownError } from "@/lib/mini-quizzes/core.mjs"
import { isUuid } from "@/lib/materials/pdf.mjs"

export type SubmitMiniQuizResult =
  | { ok: true; attemptId: string }
  | { ok: false; error: string; nextAvailableAt?: string }

/**
 * Envia as respostas. Correção, acesso ao curso e intervalo de 7 dias são
 * decididos pela RPC no banco; aqui só se normaliza a entrada.
 */
export async function submitMiniQuiz(quizId: string, answers: Record<string, string | null>): Promise<SubmitMiniQuizResult> {
  if (!isUuid(quizId)) return { ok: false, error: "Mini simulado inválido." }
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return { ok: false, error: "Sua sessão expirou. Entre novamente." }

  const { data: questions, error: questionsError } = await supabase
    .from("mini_quiz_questions")
    .select("id")
    .eq("quiz_id", quizId)
    .is("archived_at", null)
  if (questionsError || !questions || questions.length === 0) {
    if (questionsError) logSafeServerError("mini_quiz.submit_questions_failed", questionsError)
    return { ok: false, error: "Este mini simulado não está disponível." }
  }

  const payload = normalizeAnswers(answers, questions.map((question) => question.id))
  const { data, error } = await supabase.rpc("submit_mini_quiz", { p_quiz_id: quizId, p_answers: payload })
  if (error) {
    const next = parseCooldownError(error.message)
    if (next) {
      return { ok: false, error: "Você poderá refazer este mini simulado 7 dias após a última tentativa.", nextAvailableAt: next.toISOString() }
    }
    if (/MINI_QUIZ_NOT_AVAILABLE/.test(error.message)) return { ok: false, error: "Este mini simulado não está disponível." }
    if (/MINI_QUIZ_INVALID_ANSWERS/.test(error.message)) {
      return { ok: false, error: "As questões foram atualizadas. Recarregue a página e tente novamente." }
    }
    logSafeServerError("mini_quiz.submit_failed", error)
    return { ok: false, error: "Não foi possível enviar suas respostas. Tente novamente." }
  }

  const attemptId = (data as { attempt_id?: string } | null)?.attempt_id
  if (!attemptId) return { ok: false, error: "Não foi possível registrar a tentativa." }
  revalidatePath("/aluno/mini-simulados")
  return { ok: true, attemptId }
}
