"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import type { AdminMaterial, AdminMaterialType } from "@/lib/admin/types"
import { throwSafeDatabaseError } from "@/lib/security/safe-error"

export interface MaterialFormInput {
  title: string
  type: AdminMaterialType
  url: string
  description: string
  courseId: string | null
  subjectId: string | null
}

export interface HotmartMaterialImportInput {
  courseId: string
  subjectId: string | null
  materials: Array<{
    title: string
    type: AdminMaterialType
    url: string
    duration: string | null
  }>
}

export interface HotmartMaterialImportResult {
  created: number
  skipped: number
}

function normalizeUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(candidate)
    if (!("http:" === parsed.protocol || "https:" === parsed.protocol) || !parsed.hostname) return ""
    return parsed.toString()
  } catch {
    return ""
  }
}

function isHotmartUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" && (parsed.hostname === "hotmart.com" || parsed.hostname.endsWith(".hotmart.com"))
  } catch {
    return false
  }
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

export async function createMaterial(input: MaterialFormInput): Promise<AdminMaterial> {
  const { supabase } = await requireAdmin()

  const title = input.title.trim()
  const url = normalizeUrl(input.url)
  if (!title) throw new Error("Informe o título do material.")
  if (!url) throw new Error("Informe a URL do material.")

  await assertSubjectBelongsToCourse(supabase, input.courseId, input.subjectId)

  const { data, error } = await supabase
    .from("materials")
    .insert({
      title,
      type: input.type,
      url,
      description: input.description.trim() || null,
      course_id: input.courseId,
      subject_id: input.subjectId,
    })
    .select("id, course_id, subject_id, title, type, url, description, created_at")
    .single()

  if (error) throwSafeDatabaseError("admin.material.create_failed", error, "Não foi possível criar o material.")
  if (!data) throw new Error("Não foi possível carregar o material criado.")

  revalidatePath("/admin/materiais")
  if (input.courseId) revalidatePath(`/admin/cursos/${input.courseId}`)

  return {
    id: data.id,
    courseId: data.course_id,
    subjectId: data.subject_id,
    title: data.title,
    type: data.type,
    url: data.url,
    description: data.description,
    createdAt: data.created_at,
  }
}

export async function importHotmartMaterials(input: HotmartMaterialImportInput): Promise<HotmartMaterialImportResult> {
  const { supabase } = await requireAdmin()
  if (!input.courseId) throw new Error("Selecione o curso dos materiais.")
  if (input.materials.length === 0) throw new Error("Selecione pelo menos um material para importar.")
  if (input.materials.length > 500) throw new Error("Importe no máximo 500 materiais por vez.")

  const { data: course } = await supabase.from("courses").select("id").eq("id", input.courseId).maybeSingle()
  if (!course) throw new Error("O curso selecionado não foi encontrado.")
  await assertSubjectBelongsToCourse(supabase, input.courseId, input.subjectId)

  const normalized = input.materials.map((material) => {
    const title = material.title.trim()
    const url = normalizeUrl(material.url)
    if (!title) throw new Error("Todos os materiais precisam ter título.")
    if (title.length > 300) throw new Error(`O título \"${title.slice(0, 40)}...\" é muito longo.`)
    if (!url || !isHotmartUrl(url)) throw new Error(`O link de \"${title}\" não é uma URL válida da Hotmart.`)
    if (!["videoaula", "apostila", "link"].includes(material.type)) throw new Error(`O tipo de \"${title}\" é inválido.`)

    return {
      title,
      type: material.type,
      url,
      description: material.duration ? `Duração: ${material.duration}` : null,
      course_id: input.courseId,
      subject_id: input.subjectId,
    }
  })

  const uniqueByUrl = [...new Map(normalized.map((material) => [material.url, material])).values()]
  const { data: existing, error: existingError } = await supabase
    .from("materials")
    .select("url")
    .eq("course_id", input.courseId)

  if (existingError) {
    throwSafeDatabaseError("admin.material.import_lookup_failed", existingError, "Não foi possível verificar materiais já cadastrados.")
  }

  const existingUrls = new Set((existing ?? []).map((material) => normalizeUrl(material.url)))
  const toInsert = uniqueByUrl.filter((material) => !existingUrls.has(material.url))

  if (toInsert.length > 0) {
    const { error } = await supabase.from("materials").insert(toInsert)
    if (error) throwSafeDatabaseError("admin.material.import_failed", error, "Não foi possível importar os materiais.")
  }

  revalidatePath("/admin/materiais")
  revalidatePath(`/admin/cursos/${input.courseId}`)
  return { created: toInsert.length, skipped: input.materials.length - toInsert.length }
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

  if (error) throwSafeDatabaseError("admin.material.update_failed", error, "Não foi possível atualizar o material.")

  revalidatePath("/admin/materiais")
  if (input.courseId) revalidatePath(`/admin/cursos/${input.courseId}`)
}

export async function deleteMaterial(materialId: string, courseId: string | null) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from("materials").delete().eq("id", materialId)
  if (error) throwSafeDatabaseError("admin.material.delete_failed", error, "Não foi possível excluir o material.")

  revalidatePath("/admin/materiais")
  if (courseId) revalidatePath(`/admin/cursos/${courseId}`)
}
