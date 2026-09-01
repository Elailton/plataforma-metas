"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"

export interface HotmartProductMappingInput {
  hotmartProductId: string
  hotmartProductUcode: string
  hotmartProductName: string
}

async function assertCourseExists(supabase: any, courseId: string) {
  const { data: course, error } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!course) throw new Error("Curso inválido.")
}

export async function createHotmartProductMapping(
  courseId: string,
  input: HotmartProductMappingInput,
) {
  const { supabase } = await requireAdmin()
  await assertCourseExists(supabase, courseId)

  const productUcode = input.hotmartProductUcode.trim()
  if (!productUcode) throw new Error("Informe o product.ucode da Hotmart.")

  const { error } = await supabase.from("hotmart_product_mappings").insert({
    course_id: courseId,
    hotmart_product_id: input.hotmartProductId.trim() || null,
    hotmart_product_ucode: productUcode,
    hotmart_product_name: input.hotmartProductName.trim() || null,
    active: true,
  })

  if (error?.code === "23505") {
    throw new Error("Este product.ucode já está vinculado a um curso.")
  }
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function setHotmartProductMappingActive(
  courseId: string,
  mappingId: string,
  active: boolean,
) {
  const { supabase } = await requireAdmin()
  await assertCourseExists(supabase, courseId)

  const { data, error } = await supabase
    .from("hotmart_product_mappings")
    .update({ active })
    .eq("id", mappingId)
    .eq("course_id", courseId)
    .select("id")
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error("Mapeamento Hotmart inválido para este curso.")

  revalidatePath(`/admin/cursos/${courseId}`)
}

