import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { logSafeServerError } from "@/lib/security/safe-error"
import type { AlternativeKey, QuizAttemptRow } from "@/lib/mini-quizzes/core.mjs"
import { isUuid } from "@/lib/mini-quizzes/core.mjs"

export interface QuizAlternative {
  key: AlternativeKey
  text: string
}

export interface QuizQuestion {
  id: string
  position: number
  statement: string
  alternatives: QuizAlternative[]
}

export interface DiagnosisSubjectRow {
  id: string
  name: string
  position: number | null
  topics: Array<{ id: string; title: string; parent_topic_id: string | null }>
}

const ATTEMPT_COLUMNS =
  "id, quiz_id, attempt_number, correct_count, answered_count, total_count, submitted_at, month_start, is_first_of_month"

function fail(event: string, error: unknown, message: string): never {
  logSafeServerError(event, error)
  throw new Error(message)
}

/** Disciplinas do curso com os assuntos do edital (para nomes e diagnóstico). */
/** Rótulo acima do título: disciplina ou, no simulado semanal, a semana. */
function quizLabel(subject: unknown, weekNumber: number | null | undefined) {
  const name = (Array.isArray(subject) ? subject[0] : subject) as { name?: string } | null
  if (name?.name) return name.name
  return weekNumber ? `Simulado semanal · Semana ${weekNumber}` : "Simulado semanal"
}

export const getCourseSubjects = cache(async function getCourseSubjects(courseId: string): Promise<DiagnosisSubjectRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, position, syllabus_topics(id, title, parent_topic_id)")
    .eq("course_id", courseId)
  if (error) fail("mini_quiz.subjects_failed", error, "Não foi possível carregar as disciplinas.")
  return (data ?? []).map((subject) => ({
    id: subject.id,
    name: subject.name,
    position: subject.position,
    topics: (subject.syllabus_topics ?? []) as DiagnosisSubjectRow["topics"],
  }))
})

/** Mini simulados publicados do curso (a RLS garante acesso efetivo), contagem de questões e tentativas do usuário. */
export async function getStudentQuizOverview(courseId: string, userId: string) {
  const supabase = await createClient()
  const [quizzesResult, attemptsResult, subjects] = await Promise.all([
    supabase
      .from("mini_quizzes")
      .select("id, subject_id, title, description, position, week_number, release_date, mini_quiz_questions(id, archived_at)")
      .eq("course_id", courseId)
      .eq("status", "published"),
    supabase.from("mini_quiz_attempts").select(ATTEMPT_COLUMNS).eq("course_id", courseId).eq("user_id", userId),
    getCourseSubjects(courseId),
  ])
  if (quizzesResult.error) fail("mini_quiz.list_failed", quizzesResult.error, "Não foi possível carregar os mini simulados.")
  if (attemptsResult.error) fail("mini_quiz.attempts_failed", attemptsResult.error, "Não foi possível carregar suas tentativas.")

  const questionCounts: Record<string, number> = {}
  for (const quiz of quizzesResult.data ?? []) {
    questionCounts[quiz.id] = (quiz.mini_quiz_questions ?? []).filter((question) => !question.archived_at).length
  }
  return {
    subjects,
    quizzes: (quizzesResult.data ?? []).map(({ mini_quiz_questions: _questions, ...quiz }) => quiz),
    questionCounts,
    attempts: (attemptsResult.data ?? []) as QuizAttemptRow[],
  }
}

/** Mini simulado para resolver: só enunciado e alternativas (o gabarito não é legível pelo aluno). */
export async function getStudentQuiz(quizId: string, userId: string) {
  if (!isUuid(quizId)) return null
  const supabase = await createClient()
  const [quizResult, questionsResult, attemptsResult] = await Promise.all([
    supabase
      .from("mini_quizzes")
      .select("id, course_id, subject_id, title, description, status, week_number, subjects(name)")
      .eq("id", quizId)
      .eq("status", "published")
      .maybeSingle(),
    supabase
      .from("mini_quiz_questions")
      .select("id, position, statement, alternatives")
      .eq("quiz_id", quizId)
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("mini_quiz_attempts")
      .select(ATTEMPT_COLUMNS)
      .eq("quiz_id", quizId)
      .eq("user_id", userId)
      .order("attempt_number"),
  ])
  if (quizResult.error) fail("mini_quiz.read_failed", quizResult.error, "Não foi possível carregar o mini simulado.")
  if (!quizResult.data) return null
  if (questionsResult.error) fail("mini_quiz.questions_failed", questionsResult.error, "Não foi possível carregar as questões.")
  if (attemptsResult.error) fail("mini_quiz.attempts_failed", attemptsResult.error, "Não foi possível carregar suas tentativas.")
  const subject = Array.isArray(quizResult.data.subjects) ? quizResult.data.subjects[0] : quizResult.data.subjects
  return {
    quiz: {
      id: quizResult.data.id,
      courseId: quizResult.data.course_id,
      title: quizResult.data.title,
      description: quizResult.data.description,
      subjectName: quizLabel(subject, quizResult.data.week_number),
    },
    questions: (questionsResult.data ?? []) as QuizQuestion[],
    attempts: (attemptsResult.data ?? []) as QuizAttemptRow[],
  }
}

export interface ReviewedQuestion extends QuizQuestion {
  chosenKey: AlternativeKey | null
  correctKey: AlternativeKey | null
  isCorrect: boolean
  explanation: string | null
}

/** Revisão de uma tentativa: própria (aluno) ou de qualquer aluno (admin), decidido no banco. */
export async function getAttemptReview(attemptId: string) {
  if (!isUuid(attemptId)) return null
  const supabase = await createClient()
  const { data: attempt, error } = await supabase
    .from("mini_quiz_attempts")
    .select(`${ATTEMPT_COLUMNS}, user_id, course_id, mini_quizzes(title, week_number, subjects(name))`)
    .eq("id", attemptId)
    .maybeSingle()
  if (error) fail("mini_quiz.attempt_read_failed", error, "Não foi possível carregar a tentativa.")
  if (!attempt) return null

  const [questionsResult, reviewResult] = await Promise.all([
    supabase.rpc("mini_quiz_attempt_questions", { p_attempt_id: attemptId }),
    supabase.rpc("mini_quiz_attempt_review", { p_attempt_id: attemptId }),
  ])
  if (questionsResult.error || reviewResult.error) {
    fail("mini_quiz.review_failed", questionsResult.error ?? reviewResult.error, "Não foi possível carregar a correção.")
  }
  const review = new Map(
    ((reviewResult.data ?? []) as Array<{
      question_id: string
      chosen_key: AlternativeKey | null
      correct_key: AlternativeKey | null
      is_correct: boolean
      explanation: string | null
    }>).map((row) => [row.question_id, row]),
  )
  const questions: ReviewedQuestion[] = ((questionsResult.data ?? []) as Array<{
    question_id: string
    question_position: number
    statement: string
    alternatives: QuizAlternative[]
  }>).map((row) => {
    const reviewed = review.get(row.question_id)
    return {
      id: row.question_id,
      position: row.question_position,
      statement: row.statement,
      alternatives: row.alternatives,
      chosenKey: reviewed?.chosen_key ?? null,
      correctKey: reviewed?.correct_key ?? null,
      isCorrect: reviewed?.is_correct ?? false,
      explanation: reviewed?.explanation ?? null,
    }
  })
  const quiz = Array.isArray(attempt.mini_quizzes) ? attempt.mini_quizzes[0] : attempt.mini_quizzes
  const subject = quiz && (Array.isArray(quiz.subjects) ? quiz.subjects[0] : quiz.subjects)
  return {
    attempt: attempt as unknown as QuizAttemptRow & { user_id: string; course_id: string; answered_count: number },
    quizTitle: (quiz as { title?: string } | null)?.title ?? "Mini simulado",
    subjectName: quizLabel(subject, (quiz as { week_number?: number | null } | null)?.week_number),
    questions,
  }
}

/** Dados do diagnóstico de um aluno num curso. O banco libera só o próprio aluno ou um administrador. */
export async function getDiagnosisData(courseId: string, userId: string) {
  const supabase = await createClient()
  const [subjects, attemptsResult] = await Promise.all([
    getCourseSubjects(courseId),
    supabase
      .from("mini_quiz_attempts")
      .select(`${ATTEMPT_COLUMNS}, mini_quizzes(title)`)
      .eq("course_id", courseId)
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false }),
  ])
  if (attemptsResult.error) fail("mini_quiz.diagnosis_attempts_failed", attemptsResult.error, "Não foi possível carregar o diagnóstico.")
  const attempts = (attemptsResult.data ?? []) as unknown as Array<QuizAttemptRow & { mini_quizzes: { title: string } | null }>
  const countedIds = attempts.filter((attempt) => attempt.is_first_of_month).map((attempt) => attempt.id)

  let answers: Array<{ attempt_id: string; subject_id: string | null; topic_id: string | null; is_correct: boolean }> = []
  if (countedIds.length > 0) {
    const { data, error } = await supabase
      .from("mini_quiz_attempt_answers")
      .select("attempt_id, subject_id, topic_id, is_correct")
      .in("attempt_id", countedIds)
    if (error) fail("mini_quiz.diagnosis_answers_failed", error, "Não foi possível carregar o diagnóstico.")
    answers = data ?? []
  }
  return {
    subjects,
    attempts: attempts.map((attempt) => ({
      ...attempt,
      quizTitle: (Array.isArray(attempt.mini_quizzes) ? attempt.mini_quizzes[0]?.title : attempt.mini_quizzes?.title) ?? "Mini simulado",
    })),
    answers,
  }
}
