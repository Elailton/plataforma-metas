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
  "id, quiz_id, attempt_number, correct_count, answered_count, total_count, submitted_at, month_start, is_first_of_month, duration_seconds"

function fail(event: string, error: unknown, message: string): never {
  logSafeServerError(event, error)
  throw new Error(message)
}

/** Disciplinas do curso com os assuntos do edital (para nomes e diagnóstico). */
/** Rótulo acima do título: disciplina ou, no simulado semanal, a semana. */
function quizLabel(subject: unknown, weekNumber: number | null | undefined) {
  const name = (Array.isArray(subject) ? subject[0] : subject) as { name?: string } | null
  if (name?.name) return name.name
  return weekNumber ? `Semana ${weekNumber}` : "Diagnóstico Semanal"
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
  if (quizzesResult.error) fail("mini_quiz.list_failed", quizzesResult.error, "Não foi possível carregar os simulados.")
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
  const [quizResult, questionsResult, attemptsResult, startResult] = await Promise.all([
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
    supabase
      .from("mini_quiz_starts")
      .select("started_at, show_in_ranking")
      .eq("quiz_id", quizId)
      .eq("user_id", userId)
      .is("finished_at", null)
      .maybeSingle(),
  ])
  if (quizResult.error) fail("mini_quiz.read_failed", quizResult.error, "Não foi possível carregar o simulado.")
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
      isWeekly: !quizResult.data.subject_id,
    },
    questions: (questionsResult.data ?? []) as QuizQuestion[],
    attempts: (attemptsResult.data ?? []) as QuizAttemptRow[],
    // Resolução em andamento (cronômetro rodando). Sem a tabela/registro, começa do zero.
    openStart: startResult.error ? null : ((startResult.data as { started_at: string; show_in_ranking: boolean } | null) ?? null),
  }
}

export interface RankingRow {
  rank: number
  display_name: string
  correct_count: number
  total_count: number
  duration_seconds: number | null
  is_me: boolean
  participants: number
}

/** Ranking de um simulado (topo e a própria posição). Falha vira lista vazia: o ranking nunca derruba a página. */
export async function getQuizRanking(quizId: string, limit = 10): Promise<RankingRow[]> {
  if (!isUuid(quizId)) return []
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("mini_quiz_ranking", { p_quiz_id: quizId, p_limit: limit })
  if (error) {
    logSafeServerError("mini_quiz.ranking_failed", error)
    return []
  }
  return (data ?? []) as RankingRow[]
}

/** Simulado semanal mais recente liberado para o aluno (a RLS aplica grupo e data) e o seu ranking. */
export async function getLatestWeeklyRanking(courseId: string, limit = 5) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("mini_quizzes")
    .select("id, title, week_number, release_date")
    .eq("course_id", courseId)
    .eq("status", "published")
    .is("subject_id", null)
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("week_number", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    logSafeServerError("mini_quiz.latest_weekly_failed", error)
    return null
  }
  if (!data) return null
  return { quiz: data as { id: string; title: string; week_number: number | null }, rows: await getQuizRanking(data.id, limit) }
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
    .select(`${ATTEMPT_COLUMNS}, user_id, course_id, mini_quizzes(title, week_number, subject_id, subjects(name))`)
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
    isWeekly: !(quiz as { subject_id?: string | null } | null)?.subject_id,
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


/** Acertos por disciplina de uma tentativa (a RLS libera só a própria ou o administrador). */
export async function getAttemptSubjectBreakdown(attemptId: string, courseId: string) {
  if (!isUuid(attemptId)) return []
  const supabase = await createClient()
  const [answersResult, subjects] = await Promise.all([
    supabase.from("mini_quiz_attempt_answers").select("subject_id, is_correct, position").eq("attempt_id", attemptId),
    getCourseSubjects(courseId),
  ])
  if (answersResult.error) {
    logSafeServerError("mini_quiz.breakdown_failed", answersResult.error)
    return []
  }
  const order = new Map(subjects.map((subject) => [subject.id, subject]))
  const tally = new Map<string, { id: string; name: string; correct: number; total: number; first: number }>()
  for (const answer of answersResult.data ?? []) {
    const id = answer.subject_id ?? "sem-disciplina"
    const entry = tally.get(id) ?? { id, name: order.get(id)?.name ?? "Outras", correct: 0, total: 0, first: answer.position }
    entry.total += 1
    if (answer.is_correct) entry.correct += 1
    entry.first = Math.min(entry.first, answer.position)
    tally.set(id, entry)
  }
  return [...tally.values()].sort((a, b) => a.first - b.first)
}

export interface ErrorReportItem {
  attemptId: string
  quizTitle: string
  questionId: string
  number: number
  excerpt: string
  chosenKey: AlternativeKey | null
  correctKey: AlternativeKey | null
  subjectId: string | null
  topicId: string | null
}

/** Questões erradas ou em branco de todas as tentativas do aluno no curso, para o Relatório. */
export async function getErrorReport(courseId: string, userId: string): Promise<ErrorReportItem[]> {
  const supabase = await createClient()
  const { data: attempts, error } = await supabase
    .from("mini_quiz_attempts")
    .select("id, submitted_at, mini_quizzes(title)")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
  if (error) fail("mini_quiz.report_attempts_failed", error, "Não foi possível carregar o relatório.")
  const items: ErrorReportItem[] = []
  for (const attempt of attempts ?? []) {
    const [questionsResult, reviewResult, answersResult] = await Promise.all([
      supabase.rpc("mini_quiz_attempt_questions", { p_attempt_id: attempt.id }),
      supabase.rpc("mini_quiz_attempt_review", { p_attempt_id: attempt.id }),
      supabase.from("mini_quiz_attempt_answers").select("question_id, subject_id, topic_id").eq("attempt_id", attempt.id),
    ])
    if (questionsResult.error || reviewResult.error || answersResult.error) {
      logSafeServerError("mini_quiz.report_attempt_failed", questionsResult.error ?? reviewResult.error ?? answersResult.error)
      continue
    }
    const review = new Map(
      ((reviewResult.data ?? []) as Array<{ question_id: string; chosen_key: AlternativeKey | null; correct_key: AlternativeKey | null; is_correct: boolean }>).map(
        (row) => [row.question_id, row],
      ),
    )
    const scope = new Map((answersResult.data ?? []).map((row) => [row.question_id, row]))
    const quiz = Array.isArray(attempt.mini_quizzes) ? attempt.mini_quizzes[0] : attempt.mini_quizzes
    const questions = ((questionsResult.data ?? []) as Array<{ question_id: string; question_position: number; statement: string }>).sort(
      (a, b) => a.question_position - b.question_position,
    )
    questions.forEach((question, index) => {
      const row = review.get(question.question_id)
      if (!row || row.is_correct) return
      items.push({
        attemptId: attempt.id,
        quizTitle: (quiz as { title?: string } | null)?.title ?? "Diagnóstico Semanal",
        questionId: question.question_id,
        number: index + 1,
        excerpt: statementExcerpt(question.statement),
        chosenKey: row.chosen_key,
        correctKey: row.correct_key,
        subjectId: scope.get(question.question_id)?.subject_id ?? null,
        topicId: scope.get(question.question_id)?.topic_id ?? null,
      })
    })
  }
  return items
}

/** Último parágrafo do enunciado (a pergunta), sem marcações, para listas curtas. */
function statementExcerpt(rawStatement: string) {
  const statement = rawStatement.replace(/^\s*\[\[inedita\]\]\s*\n?/i, "")
  const blocks = statement.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
  const stem = (blocks.length > 1 && statement.startsWith("**Texto associado**") ? blocks[blocks.length - 1] : statement)
    .replace(/\*\*|__/g, "")
    .replace(/\\_/g, "_")
    .replace(/\s+/g, " ")
    .trim()
  return stem.length > 180 ? `${stem.slice(0, 177)}…` : stem
}
