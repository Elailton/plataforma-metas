"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import { logSafeServerError, throwSafeDatabaseError } from "@/lib/security/safe-error"

export type EditalActionResult = { ok: true } | { ok: false; message: string }

function normalizeTopicTitle(line: string) {
  return line.trim().replace(/^\d+(?:\.\d+)*[\s.)-]+/, "").trim()
}

function isMissingSubtopicColumn(error: { code?: string; message?: string } | null) {
  return Boolean(
    error
      && ["42703", "PGRST204", "PGRST200"].includes(error.code ?? "")
      && /parent_topic_id|subtopic_id|column|schema cache/i.test(error.message ?? ""),
  )
}

function actionError(message: string): EditalActionResult {
  return { ok: false, message }
}

export async function createSubject(courseId: string, name: string) {
  const { supabase } = await requireAdmin()

  const trimmed = name.trim()
  if (!trimmed) throw new Error("Informe o nome da disciplina.")

  const { count } = await supabase
    .from("subjects")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)

  const { error } = await supabase.from("subjects").insert({
    course_id: courseId,
    name: trimmed,
    position: count ?? 0,
  })

  if (error) throwSafeDatabaseError("admin.subject.create_failed", error, "Não foi possível criar a disciplina.")
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function renameSubject(subjectId: string, courseId: string, name: string) {
  const { supabase } = await requireAdmin()

  const trimmed = name.trim()
  if (!trimmed) throw new Error("Informe o nome da disciplina.")

  const { error } = await supabase.from("subjects").update({ name: trimmed }).eq("id", subjectId)
  if (error) throwSafeDatabaseError("admin.subject.rename_failed", error, "Não foi possível renomear a disciplina.")
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function deleteSubject(subjectId: string, courseId: string) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from("subjects").delete().eq("id", subjectId)
  if (error) throwSafeDatabaseError("admin.subject.delete_failed", error, "Não foi possível excluir a disciplina.")
  revalidatePath(`/admin/cursos/${courseId}`)
}

/**
 * Adiciona vários tópicos de uma vez, um por linha, a uma disciplina.
 */
export async function addSyllabusTopicsBulk(
  subjectId: string,
  courseId: string,
  rawTopics: string,
  parentTopicId: string | null = null,
): Promise<EditalActionResult> {
  const { supabase } = await requireAdmin()

  const titles = rawTopics
    .split("\n")
    .map(normalizeTopicTitle)
    .filter(Boolean)

  if (titles.length === 0) return actionError("Informe ao menos um tópico.")

  if (!parentTopicId) {
    const { count, error: countError } = await supabase
      .from("syllabus_topics")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", subjectId)

    if (countError) {
      logSafeServerError("admin.topic.count_failed", countError)
      return actionError("Não foi possível preparar os tópicos.")
    }

    let position = count ?? 0
    const rows = titles.map((title) => ({ subject_id: subjectId, title, position: position++ }))
    const { error } = await supabase.from("syllabus_topics").insert(rows)
    if (error) {
      logSafeServerError("admin.topic.bulk_create_failed", error)
      return actionError("Não foi possível adicionar os tópicos.")
    }
    revalidatePath(`/admin/cursos/${courseId}`)
    return { ok: true }
  }

  if (parentTopicId) {
    const { data: parent, error: parentError } = await supabase
      .from("syllabus_topics")
      .select("id, subject_id, parent_topic_id")
      .eq("id", parentTopicId)
      .single()

    if (isMissingSubtopicColumn(parentError)) {
      return actionError("A estrutura de subtópicos ainda não foi aplicada no banco. Aplique a migration antes de criar subtópicos.")
    }
    if (parentError) {
      logSafeServerError("admin.topic.parent_read_failed", parentError)
      return actionError("Não foi possível validar o tópico principal.")
    }
    if (!parent || parent.subject_id !== subjectId || parent.parent_topic_id) {
      return actionError("O tópico principal selecionado não pertence à disciplina.")
    }
  }

  const { count, error: countError } = await supabase
    .from("syllabus_topics")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", subjectId)
    .eq("parent_topic_id", parentTopicId)

  if (isMissingSubtopicColumn(countError)) {
    return actionError("A estrutura de subtópicos ainda não foi aplicada no banco. Aplique a migration antes de criar subtópicos.")
  }
  if (countError) {
    logSafeServerError("admin.topic.count_failed", countError)
    return actionError("Não foi possível preparar os tópicos.")
  }

  let position = count ?? 0
  const rows = titles.map((title) => ({ subject_id: subjectId, parent_topic_id: parentTopicId, title, position: position++ }))

  const { error } = await supabase.from("syllabus_topics").insert(rows)
  if (error) {
    logSafeServerError("admin.topic.bulk_create_failed", error)
    return actionError("Não foi possível adicionar os tópicos.")
  }
  revalidatePath(`/admin/cursos/${courseId}`)
  return { ok: true }
}

export async function renameSyllabusTopic(topicId: string, courseId: string, title: string) {
  const { supabase } = await requireAdmin()

  const trimmed = title.trim()
  if (!trimmed) throw new Error("Informe o título do tópico.")

  const { error } = await supabase.from("syllabus_topics").update({ title: trimmed }).eq("id", topicId)
  if (error) throwSafeDatabaseError("admin.topic.rename_failed", error, "Não foi possível renomear o tópico.")
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function deleteSyllabusTopic(topicId: string, courseId: string) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from("syllabus_topics").delete().eq("id", topicId)
  if (error) throwSafeDatabaseError("admin.topic.delete_failed", error, "Não foi possível excluir o tópico.")
  revalidatePath(`/admin/cursos/${courseId}`)
}
