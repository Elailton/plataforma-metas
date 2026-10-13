"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import { logSafeServerError } from "@/lib/security/safe-error"
import { isUuid } from "@/lib/materials/pdf.mjs"
import { validateQuestionDraft } from "@/lib/mini-quizzes/core.mjs"
import type { MiniQuizStatus } from "@/lib/admin/mini-quizzes"

export interface MiniQuizSaveInput {
  quizId: string | null
  courseId: string
  subjectId: string
  topicId: string | null
  title: string
  description: string
  status: MiniQuizStatus
  position: number
  expectedUpdatedAt: string | null
  questions: Array<{
    id: string | null
    statement: string
    alternatives: Array<{ key: string; text: string }>
    topicId: string | null
    correctKey: string
    explanation: string
  }>
}

const ERROR_MESSAGES: Array<[RegExp, string]> = [
  [/MINI_QUIZ_VERSION_CONFLICT/, "Este mini simulado foi alterado em outra aba. Recarregue a página antes de salvar."],
  [/MINI_QUIZ_INVALID_SUBJECT/, "A disciplina não pertence a este curso."],
  [/MINI_QUIZ_INVALID_TOPIC/, "Um dos assuntos não pertence à disciplina escolhida."],
  [/MINI_QUIZ_INVALID_ALTERNATIVES/, "Revise as alternativas: letras repetidas ou texto vazio."],
  [/MINI_QUIZ_INVALID_KEY/, "Cada questão precisa ter a alternativa correta marcada."],
  [/MINI_QUIZ_EMPTY/, "Para publicar, cadastre pelo menos uma questão."],
  [/MINI_QUIZ_NOT_FOUND/, "Mini simulado não encontrado."],
]

export async function saveMiniQuiz(input: MiniQuizSaveInput): Promise<{ ok: true; quizId: string } | { ok: false; error: string }> {
  const { supabase } = await requireAdmin()
  if (!isUuid(input.courseId) || !isUuid(input.subjectId)) return { ok: false, error: "Selecione curso e disciplina." }
  if (input.quizId && !isUuid(input.quizId)) return { ok: false, error: "Mini simulado inválido." }
  if (input.topicId && !isUuid(input.topicId)) return { ok: false, error: "Assunto inválido." }
  const title = input.title.trim()
  if (!title) return { ok: false, error: "Informe o título." }
  if (title.length > 300) return { ok: false, error: "O título deve ter até 300 caracteres." }
  if (!["draft", "published", "archived"].includes(input.status)) return { ok: false, error: "Situação inválida." }
  if (input.questions.length > 200) return { ok: false, error: "Use no máximo 200 questões por mini simulado." }

  const questions = []
  for (const [index, question] of input.questions.entries()) {
    const alternatives = question.alternatives
      .map((alternative) => ({ key: alternative.key, text: alternative.text.trim() }))
      .filter((alternative) => alternative.text)
    const problem = validateQuestionDraft({ statement: question.statement, alternatives, correctKey: question.correctKey })
    if (problem) return { ok: false, error: `Questão ${index + 1}: ${problem}` }
    if (question.id && !isUuid(question.id)) return { ok: false, error: `Questão ${index + 1}: identificador inválido.` }
    if (question.topicId && !isUuid(question.topicId)) return { ok: false, error: `Questão ${index + 1}: assunto inválido.` }
    questions.push({
      id: question.id,
      statement: question.statement.trim(),
      alternatives,
      topic_id: question.topicId,
      correct_key: question.correctKey,
      explanation: question.explanation.trim(),
    })
  }

  const { data, error } = await supabase.rpc("admin_save_mini_quiz", {
    p_quiz_id: input.quizId,
    p_course_id: input.courseId,
    p_quiz: {
      subject_id: input.subjectId,
      topic_id: input.topicId,
      title,
      description: input.description,
      status: input.status,
      position: Number.isFinite(input.position) ? Math.trunc(input.position) : 0,
    },
    p_questions: questions,
    p_expected_updated_at: input.expectedUpdatedAt,
  })
  if (error) {
    const known = ERROR_MESSAGES.find(([pattern]) => pattern.test(error.message))
    if (known) return { ok: false, error: known[1] }
    logSafeServerError("admin.mini_quiz.save_failed", error)
    return { ok: false, error: "Não foi possível salvar o mini simulado." }
  }

  revalidatePath("/admin/mini-simulados")
  revalidatePath("/aluno/mini-simulados")
  return { ok: true, quizId: data as string }
}
