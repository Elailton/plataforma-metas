"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import { throwSafeDatabaseError } from "@/lib/security/safe-error"

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
) {
  const { supabase } = await requireAdmin()

  const titles = rawTopics
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (titles.length === 0) throw new Error("Informe ao menos um tópico.")

  if (parentTopicId) {
    const { data: parent } = await supabase
      .from("syllabus_topics")
      .select("id, subject_id, parent_topic_id")
      .eq("id", parentTopicId)
      .single()

    if (!parent || parent.subject_id !== subjectId || parent.parent_topic_id) {
      throw new Error("O tópico principal selecionado não pertence à disciplina.")
    }
  }

  const countQuery = supabase
    .from("syllabus_topics")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", subjectId)
  const { count } = parentTopicId
    ? await countQuery.eq("parent_topic_id", parentTopicId)
    : await countQuery.is("parent_topic_id", null)

  let position = count ?? 0
  const rows = titles.map((title) => ({ subject_id: subjectId, parent_topic_id: parentTopicId, title, position: position++ }))

  const { error } = await supabase.from("syllabus_topics").insert(rows)
  if (error) throwSafeDatabaseError("admin.topic.bulk_create_failed", error, "Não foi possível adicionar os tópicos.")
  revalidatePath(`/admin/cursos/${courseId}`)
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
