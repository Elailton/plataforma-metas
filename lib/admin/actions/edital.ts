"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"

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

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function renameSubject(subjectId: string, courseId: string, name: string) {
  const { supabase } = await requireAdmin()

  const trimmed = name.trim()
  if (!trimmed) throw new Error("Informe o nome da disciplina.")

  const { error } = await supabase.from("subjects").update({ name: trimmed }).eq("id", subjectId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function deleteSubject(subjectId: string, courseId: string) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from("subjects").delete().eq("id", subjectId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/cursos/${courseId}`)
}

/**
 * Adiciona vários tópicos de uma vez, um por linha, a uma disciplina.
 */
export async function addSyllabusTopicsBulk(subjectId: string, courseId: string, rawTopics: string) {
  const { supabase } = await requireAdmin()

  const titles = rawTopics
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (titles.length === 0) throw new Error("Informe ao menos um tópico.")

  const { count } = await supabase
    .from("syllabus_topics")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", subjectId)

  let position = count ?? 0
  const rows = titles.map((title) => ({ subject_id: subjectId, title, position: position++ }))

  const { error } = await supabase.from("syllabus_topics").insert(rows)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function renameSyllabusTopic(topicId: string, courseId: string, title: string) {
  const { supabase } = await requireAdmin()

  const trimmed = title.trim()
  if (!trimmed) throw new Error("Informe o título do tópico.")

  const { error } = await supabase.from("syllabus_topics").update({ title: trimmed }).eq("id", topicId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function deleteSyllabusTopic(topicId: string, courseId: string) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from("syllabus_topics").delete().eq("id", topicId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/cursos/${courseId}`)
}
