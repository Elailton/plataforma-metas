import "server-only"

import { createClient } from "@/lib/supabase/server"
import { logSafeServerError } from "@/lib/security/safe-error"
import { isUuid } from "@/lib/mini-quizzes/core.mjs"
import type { AlternativeKey } from "@/lib/mini-quizzes/core.mjs"

export type MiniQuizStatus = "draft" | "published" | "archived"

export interface AdminMiniQuizSummary {
  id: string
  courseId: string
  subjectId: string
  title: string
  status: MiniQuizStatus
  position: number
  questionCount: number
  attemptCount: number
  updatedAt: string
}

export interface AdminMiniQuizQuestion {
  id: string
  statement: string
  alternatives: Array<{ key: AlternativeKey; text: string }>
  topicId: string | null
  correctKey: AlternativeKey
  explanation: string
}

export interface AdminMiniQuiz {
  id: string
  courseId: string
  subjectId: string
  topicId: string | null
  title: string
  description: string
  status: MiniQuizStatus
  position: number
  updatedAt: string
  attemptCount: number
  questions: AdminMiniQuizQuestion[]
}

function fail(event: string, error: unknown, message: string): never {
  logSafeServerError(event, error)
  throw new Error(message)
}

export async function listAdminMiniQuizzes(courseId: string): Promise<AdminMiniQuizSummary[]> {
  const supabase = await createClient()
  const [quizzes, attempts] = await Promise.all([
    supabase
      .from("mini_quizzes")
      .select("id, course_id, subject_id, title, status, position, updated_at, mini_quiz_questions(id, archived_at)")
      .eq("course_id", courseId)
      .order("position")
      .order("title"),
    supabase.from("mini_quiz_attempts").select("quiz_id").eq("course_id", courseId),
  ])
  if (quizzes.error) fail("admin.mini_quiz.list_failed", quizzes.error, "Não foi possível carregar os mini simulados.")
  if (attempts.error) fail("admin.mini_quiz.attempts_failed", attempts.error, "Não foi possível carregar as tentativas.")
  const attemptCounts = new Map<string, number>()
  for (const row of attempts.data ?? []) attemptCounts.set(row.quiz_id, (attemptCounts.get(row.quiz_id) ?? 0) + 1)
  return (quizzes.data ?? []).map((quiz) => ({
    id: quiz.id,
    courseId: quiz.course_id,
    subjectId: quiz.subject_id,
    title: quiz.title,
    status: quiz.status as MiniQuizStatus,
    position: quiz.position,
    questionCount: (quiz.mini_quiz_questions ?? []).filter((question) => !question.archived_at).length,
    attemptCount: attemptCounts.get(quiz.id) ?? 0,
    updatedAt: quiz.updated_at,
  }))
}

export async function getAdminMiniQuiz(quizId: string): Promise<AdminMiniQuiz | null> {
  if (!isUuid(quizId)) return null
  const supabase = await createClient()
  const [quiz, questions, attempts] = await Promise.all([
    supabase
      .from("mini_quizzes")
      .select("id, course_id, subject_id, topic_id, title, description, status, position, updated_at")
      .eq("id", quizId)
      .maybeSingle(),
    supabase
      .from("mini_quiz_questions")
      .select("id, position, statement, alternatives, topic_id, mini_quiz_answer_keys(correct_key, explanation)")
      .eq("quiz_id", quizId)
      .is("archived_at", null)
      .order("position"),
    supabase.from("mini_quiz_attempts").select("id", { count: "exact", head: true }).eq("quiz_id", quizId),
  ])
  if (quiz.error) fail("admin.mini_quiz.read_failed", quiz.error, "Não foi possível carregar o mini simulado.")
  if (!quiz.data) return null
  if (questions.error) fail("admin.mini_quiz.questions_failed", questions.error, "Não foi possível carregar as questões.")
  return {
    id: quiz.data.id,
    courseId: quiz.data.course_id,
    subjectId: quiz.data.subject_id,
    topicId: quiz.data.topic_id,
    title: quiz.data.title,
    description: quiz.data.description ?? "",
    status: quiz.data.status as MiniQuizStatus,
    position: quiz.data.position,
    updatedAt: quiz.data.updated_at,
    attemptCount: attempts.count ?? 0,
    questions: (questions.data ?? []).map((question) => {
      const key = Array.isArray(question.mini_quiz_answer_keys) ? question.mini_quiz_answer_keys[0] : question.mini_quiz_answer_keys
      return {
        id: question.id,
        statement: question.statement,
        alternatives: question.alternatives as AdminMiniQuizQuestion["alternatives"],
        topicId: question.topic_id,
        correctKey: ((key as { correct_key?: string } | null)?.correct_key ?? "A") as AlternativeKey,
        explanation: (key as { explanation?: string | null } | null)?.explanation ?? "",
      }
    }),
  }
}
