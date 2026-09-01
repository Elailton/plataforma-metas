"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import type { AdminMaterialType } from "@/lib/admin/types"

export interface MaterialFormInput {
  title: string
  type: AdminMaterialType
  url: string
  description: string
  courseId: string | null
  subjectId: string | null
}

function normalizeUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

async function assertSubjectBelongsToCourse(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  courseId: string | null,
  subjectId: string | null,
) {
  if (!subjectId) return
  if (!courseId) throw new Error("Selecione um curso antes de escolher a disciplina.")

  const { data: subject } = await supabase.from("subjects").select("course_id").eq("id", subjectId).single()
  if (!subject || subject.course_id !== courseId) {
    throw new Error("A disciplina selecionada não pertence ao curso escolhido.")
  }
}

export async function createMaterial(input: MaterialFormInput) {
  const { supabase } = await requireAdmin()

  const title = input.title.trim()
  const url = normalizeUrl(input.url)
  if (!title) throw new Error("Informe o título do material.")
  if (!url) throw new Error("Informe a URL do material.")

  await assertSubjectBelongsToCourse(supabase, input.courseId, input.subjectId)

  const { error } = await supabase.from("materials").insert({
    title,
    type: input.type,
    url,
    description: input.description.trim() || null,
    course_id: input.courseId,
    subject_id: input.subjectId,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/materiais")
  if (input.courseId) revalidatePath(`/admin/cursos/${input.courseId}`)
}

export async function updateMaterial(materialId: string, input: MaterialFormInput) {
  const { supabase } = await requireAdmin()

  const title = input.title.trim()
  const url = normalizeUrl(input.url)
  if (!title) throw new Error("Informe o título do material.")
  if (!url) throw new Error("Informe a URL do material.")

  await assertSubjectBelongsToCourse(supabase, input.courseId, input.subjectId)

  const { error } = await supabase
    .from("materials")
    .update({
      title,
      type: input.type,
      url,
      description: input.description.trim() || null,
      course_id: input.courseId,
      subject_id: input.subjectId,
    })
    .eq("id", materialId)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/materiais")
  if (input.courseId) revalidatePath(`/admin/cursos/${input.courseId}`)
}

export async function deleteMaterial(materialId: string, courseId: string | null) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from("materials").delete().eq("id", materialId)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/materiais")
  if (courseId) revalidatePath(`/admin/cursos/${courseId}`)
}
