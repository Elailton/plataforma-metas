"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import type { AdminMaterial, AdminMaterialType } from "@/lib/admin/types"
import { throwSafeDatabaseError } from "@/lib/security/safe-error"
import {
  isMaterialFileRoute,
  isUuid,
  materialFileRoute,
  MAX_PDFS_PER_UPLOAD,
  parsePdfStoragePath,
  PDF_BUCKET,
} from "@/lib/materials/pdf.mjs"

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

export interface PdfMaterialRegistrationInput {
  courseId: string
  subjectId: string | null
  type: "apostila" | "link"
  files: Array<{ materialId: string; title: string; storagePath: string }>
}

function normalizeUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  // PDFs guardados na plataforma usam o endereço interno que confere o acesso.
  if (isMaterialFileRoute(trimmed)) return trimmed
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

export async function createMaterial(input: MaterialFormInput, options: { revalidate?: boolean } = {}): Promise<AdminMaterial> {
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

  if (options.revalidate !== false) {
    revalidatePath("/admin/materiais")
    if (input.courseId) revalidatePath(`/admin/cursos/${input.courseId}`)
  }

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

/**
 * Registra PDFs já enviados pelo administrador ao bucket privado. O arquivo é
 * enviado pelo navegador com a sessão do administrador (a política do bucket
 * exige papel admin); aqui só se cria o material que aponta para ele.
 */
export async function registerPdfMaterials(input: PdfMaterialRegistrationInput): Promise<{ created: number }> {
  const { supabase } = await requireAdmin()
  if (!isUuid(input.courseId)) throw new Error("Selecione o curso dos arquivos.")
  if (input.files.length === 0) throw new Error("Nenhum arquivo foi enviado.")
  if (input.files.length > MAX_PDFS_PER_UPLOAD) throw new Error(`Envie no máximo ${MAX_PDFS_PER_UPLOAD} arquivos por vez.`)
  if (!["apostila", "link"].includes(input.type)) throw new Error("Tipo de material inválido.")

  const { data: course } = await supabase.from("courses").select("id").eq("id", input.courseId).maybeSingle()
  if (!course) throw new Error("O curso selecionado não foi encontrado.")
  await assertSubjectBelongsToCourse(supabase, input.courseId, input.subjectId)

  const rows = input.files.map((file) => {
    const title = file.title.trim()
    const parsed = parsePdfStoragePath(file.storagePath, input.courseId)
    if (!title) throw new Error("Todos os arquivos precisam de título.")
    if (title.length > 300) throw new Error(`O título "${title.slice(0, 40)}..." é muito longo.`)
    if (!parsed || parsed.materialId !== file.materialId) throw new Error(`O arquivo de "${title}" não pertence a este curso.`)
    return {
      id: file.materialId,
      title,
      type: input.type,
      url: materialFileRoute(file.materialId),
      storage_path: file.storagePath,
      description: "PDF na plataforma",
      course_id: input.courseId,
      subject_id: input.subjectId,
    }
  })

  const { error } = await supabase.from("materials").insert(rows)
  if (error) throwSafeDatabaseError("admin.material.pdf_register_failed", error, "Não foi possível registrar os PDFs.")

  revalidatePath("/admin/materiais")
  revalidatePath(`/admin/cursos/${input.courseId}`)
  return { created: rows.length }
}

/** Remove arquivos enviados cujo registro falhou, para não deixar PDFs órfãos no bucket. */
export async function discardUploadedPdfs(courseId: string, storagePaths: string[]) {
  const { supabase } = await requireAdmin()
  const paths = storagePaths.filter((path) => parsePdfStoragePath(path, courseId))
  if (paths.length === 0) return
  const { data: registered } = await supabase.from("materials").select("storage_path").in("storage_path", paths)
  const keep = new Set((registered ?? []).map((row) => row.storage_path))
  const orphan = paths.filter((path) => !keep.has(path))
  if (orphan.length > 0) await supabase.storage.from(PDF_BUCKET).remove(orphan)
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

  const { data: existing } = await supabase.from("materials").select("storage_path").eq("id", materialId).maybeSingle()
  const { error } = await supabase.from("materials").delete().eq("id", materialId)
  if (error) throwSafeDatabaseError("admin.material.delete_failed", error, "Não foi possível excluir o material.")
  if (existing?.storage_path) await supabase.storage.from(PDF_BUCKET).remove([existing.storage_path])

  revalidatePath("/admin/materiais")
  if (courseId) revalidatePath(`/admin/cursos/${courseId}`)
}
