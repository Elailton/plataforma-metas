"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import type { CourseStatus } from "@/lib/admin/types"
import { logSafeServerError, throwSafeDatabaseError } from "@/lib/security/safe-error"
import { isIsoDate } from "@/lib/courses/exam-date.mjs"

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export interface CourseFormInput {
  name: string
  organization: string
  description: string
  status: CourseStatus
}

const COVER_COLORS = ["primary", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]

function pickCoverColor(seed: string) {
  const index = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % COVER_COLORS.length
  return COVER_COLORS[index]
}

export async function createCourse(input: CourseFormInput) {
  const { supabase } = await requireAdmin()

  const name = input.name.trim()
  if (!name) throw new Error("Informe o nome do curso.")

  const baseSlug = slugify(name)
  if (!baseSlug) throw new Error("Não foi possível gerar um identificador para este nome.")

  let slug = baseSlug
  let attempt = 1
  while (true) {
    const { data: existing } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle()
    if (!existing) break
    attempt += 1
    slug = `${baseSlug}-${attempt}`
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      name,
      slug,
      organization: input.organization.trim() || null,
      description: input.description.trim() || null,
      status: input.status,
      cover_color: pickCoverColor(baseSlug),
    })
    .select("id")
    .single()

  if (error) throwSafeDatabaseError("admin.course.create_failed", error, "Não foi possível criar o curso.")

  revalidatePath("/admin/cursos")
  return data.id as string
}

export async function updateCourse(courseId: string, input: CourseFormInput) {
  const { supabase } = await requireAdmin()

  const name = input.name.trim()
  if (!name) throw new Error("Informe o nome do curso.")

  const { error } = await supabase
    .from("courses")
    .update({
      name,
      organization: input.organization.trim() || null,
      description: input.description.trim() || null,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId)

  if (error) throwSafeDatabaseError("admin.course.update_failed", error, "Não foi possível atualizar o curso.")

  revalidatePath("/admin/cursos")
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function setCourseStatus(courseId: string, status: CourseStatus) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from("courses")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", courseId)

  if (error) throwSafeDatabaseError("admin.course.status_failed", error, "Não foi possível alterar o status do curso.")

  revalidatePath("/admin/cursos")
  revalidatePath(`/admin/cursos/${courseId}`)
}

/** Data da prova (contador do aluno e liberação da reta final). null remove. */
export async function setCourseExamDate(
  courseId: string,
  examDate: string | null,
  confirmed: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { supabase } = await requireAdmin()
  if (examDate !== null && !isIsoDate(examDate)) return { ok: false, message: "Data inválida." }
  const { error } = await supabase
    .from("courses")
    .update({ exam_date: examDate, exam_date_confirmed: examDate ? Boolean(confirmed) : false })
    .eq("id", courseId)
  if (error) {
    logSafeServerError("admin.course.exam_date_failed", error)
    return { ok: false, message: "Não foi possível salvar a data da prova." }
  }
  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath("/aluno")
  return { ok: true }
}
