"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { logSafeServerError } from "@/lib/security/safe-error"
import { normalizeAnswers, parseCooldownError } from "@/lib/mini-quizzes/core.mjs"
import { isUuid } from "@/lib/mini-quizzes/core.mjs"

export type SubmitMiniQuizResult =
  | { ok: true; attemptId: string }
  | { ok: false; error: string; nextAvailableAt?: string }

/**
 * Envia as respostas. Correção, acesso ao curso e intervalo de 7 dias são
 * decididos pela RPC no banco; aqui só se normaliza a entrada.
 */
export async function submitMiniQuiz(quizId: string, answers: Record<string, string | null>): Promise<SubmitMiniQuizResult> {
  if (!isUuid(quizId)) return { ok: false, error: "Diagnóstico inválido." }
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
    return { ok: false, error: "Este diagnóstico não está disponível." }
  }

  const payload = normalizeAnswers(answers, questions.map((question) => question.id))
  const { data, error } = await supabase.rpc("submit_mini_quiz", { p_quiz_id: quizId, p_answers: payload })
  if (error) {
    const next = parseCooldownError(error.message)
    if (next) {
      return { ok: false, error: "Você poderá refazer 7 dias após a última tentativa.", nextAvailableAt: next.toISOString() }
    }
    if (/MINI_QUIZ_NOT_AVAILABLE/.test(error.message)) return { ok: false, error: "Este diagnóstico não está disponível." }
    if (/MINI_QUIZ_ALREADY_DONE/.test(error.message)) return { ok: false, error: "Você já fez este diagnóstico. Ele não pode ser refeito." }
    if (/MINI_QUIZ_NOT_STARTED/.test(error.message)) return { ok: false, error: "Inicie o diagnóstico antes de enviar. Recarregue a página." }
    if (/MINI_QUIZ_INVALID_ANSWERS/.test(error.message)) {
      return { ok: false, error: "As questões foram atualizadas. Recarregue a página e tente novamente." }
    }
    logSafeServerError("mini_quiz.submit_failed", error)
    return { ok: false, error: "Não foi possível enviar suas respostas. Tente novamente." }
  }

  const attemptId = (data as { attempt_id?: string } | null)?.attempt_id
  if (!attemptId) return { ok: false, error: "Não foi possível registrar a tentativa." }
  revalidatePath("/aluno/diagnostico-semanal")
  revalidatePath("/aluno/relatorio")
  revalidatePath("/aluno")
  return { ok: true, attemptId }
}

export type StartMiniQuizResult =
  | { ok: true; startedAt: string; showInRanking: boolean }
  | { ok: false; error: string; nextAvailableAt?: string }

/** Inicia o cronômetro no banco e registra a escolha de aparecer no ranking. */
export async function startMiniQuiz(quizId: string, showInRanking: boolean): Promise<StartMiniQuizResult> {
  if (!isUuid(quizId)) return { ok: false, error: "Diagnóstico inválido." }
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return { ok: false, error: "Sua sessão expirou. Entre novamente." }

  const { data, error } = await supabase.rpc("start_mini_quiz", { p_quiz_id: quizId, p_show_in_ranking: showInRanking === true })
  if (error) {
    const next = parseCooldownError(error.message)
    if (next) return { ok: false, error: "Você poderá refazer 7 dias após a última tentativa.", nextAvailableAt: next.toISOString() }
    if (/MINI_QUIZ_NOT_AVAILABLE/.test(error.message)) return { ok: false, error: "Este diagnóstico não está disponível." }
    if (/MINI_QUIZ_ALREADY_DONE/.test(error.message)) return { ok: false, error: "Você já fez este diagnóstico. Ele não pode ser refeito." }
    logSafeServerError("mini_quiz.start_failed", error)
    return { ok: false, error: "Não foi possível iniciar. Tente novamente." }
  }
  const result = data as { started_at?: string; show_in_ranking?: boolean } | null
  if (!result?.started_at) return { ok: false, error: "Não foi possível iniciar." }
  revalidatePath(`/aluno/diagnostico-semanal/${quizId}`)
  return { ok: true, startedAt: result.started_at, showInRanking: result.show_in_ranking === true }
}
