"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import type { CourseStatus } from "@/lib/admin/types"

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

  if (error) throw new Error(error.message)

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

  if (error) throw new Error(error.message)

  revalidatePath("/admin/cursos")
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function setCourseStatus(courseId: string, status: CourseStatus) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from("courses")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", courseId)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/cursos")
  revalidatePath(`/admin/cursos/${courseId}`)
}
