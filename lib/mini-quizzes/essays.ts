import "server-only"

import { createClient } from "@/lib/supabase/server"
import { logSafeServerError } from "@/lib/security/safe-error"
import { isUuid } from "@/lib/mini-quizzes/core.mjs"
import type { EssayRow } from "@/lib/mini-quizzes/essay.mjs"

export type { EssayRow }

const ESSAY_COLUMNS = "id, attempt_id, quiz_id, status, submitted_at, body, image_paths, scores, score_total, feedback, graded_at"
export const ESSAY_BUCKET = "mini-quiz-essays"

// Tudo aqui é tolerante a falhas: sem a migração da redação, a prova continua funcionando.

/** Proposta de redação do simulado (null quando não houver). */
export async function getQuizEssayPrompt(quizId: string): Promise<string | null> {
  if (!isUuid(quizId)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from("mini_quizzes").select("essay_prompt").eq("id", quizId).maybeSingle()
  if (error) {
    logSafeServerError("mini_quiz.essay_prompt_failed", error)
    return null
  }
  return ((data as { essay_prompt: string | null } | null)?.essay_prompt ?? null) || null
}

/** Redação enviada para uma tentativa (do próprio aluno, pela RLS). */
export async function getAttemptEssay(attemptId: string): Promise<EssayRow | null> {
  if (!isUuid(attemptId)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from("mini_quiz_essays").select(ESSAY_COLUMNS).eq("attempt_id", attemptId).maybeSingle()
  if (error) {
    logSafeServerError("mini_quiz.essay_read_failed", error)
    return null
  }
  return (data as EssayRow | null) ?? null
}

export interface StudentEssay extends EssayRow {
  quizTitle: string
}

/** Redações do aluno no curso, para o Relatório. */
export async function getStudentEssays(courseId: string, userId: string): Promise<StudentEssay[]> {
  if (!isUuid(courseId) || !isUuid(userId)) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("mini_quiz_essays")
    .select(`${ESSAY_COLUMNS}, mini_quizzes(title)`)
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
  if (error) {
    logSafeServerError("mini_quiz.essays_list_failed", error)
    return []
  }
  return (data ?? []).map((row) => {
    const quiz = Array.isArray(row.mini_quizzes) ? row.mini_quizzes[0] : row.mini_quizzes
    return { ...(row as unknown as EssayRow), quizTitle: (quiz as { title?: string } | null)?.title ?? "Simulado" }
  })
}

export interface AdminEssay extends EssayRow {
  quizTitle: string
  studentName: string
  imageUrls: string[]
}

/** Redações de um curso para o administrador, com links temporários das fotos (1 hora). */
export async function listAdminEssays(courseId: string): Promise<AdminEssay[]> {
  if (!isUuid(courseId)) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("mini_quiz_essays")
    .select(`${ESSAY_COLUMNS}, user_id, mini_quizzes(title), profiles!mini_quiz_essays_user_id_fkey(full_name)`)
    .eq("course_id", courseId)
    .order("submitted_at", { ascending: true })
  if (error) {
    logSafeServerError("mini_quiz.admin_essays_failed", error)
    return []
  }
  const rows = data ?? []
  const paths = rows.flatMap((row) => (row.image_paths as string[]) ?? [])
  const urls = new Map<string, string>()
  if (paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage.from(ESSAY_BUCKET).createSignedUrls(paths, 3600)
    if (signError) logSafeServerError("mini_quiz.admin_essays_sign_failed", signError)
    for (const item of signed ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  }
  return rows.map((row) => {
    const quiz = Array.isArray(row.mini_quizzes) ? row.mini_quizzes[0] : row.mini_quizzes
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const imagePaths = (row.image_paths as string[]) ?? []
    return {
      ...(row as unknown as EssayRow),
      quizTitle: (quiz as { title?: string } | null)?.title ?? "Simulado",
      studentName: (profile as { full_name?: string } | null)?.full_name || "Aluno",
      imageUrls: imagePaths.map((path) => urls.get(path)).filter((url): url is string => Boolean(url)),
    }
  })
}
