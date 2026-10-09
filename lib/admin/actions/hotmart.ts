"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import { throwSafeDatabaseError } from "@/lib/security/safe-error"
import { parseOfferInput } from "@/lib/hotmart/offers.mjs"

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

  if (error) {
    throwSafeDatabaseError("admin.hotmart.course_lookup_failed", error, "Não foi possível verificar o curso.")
  }
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
  if (error) {
    throwSafeDatabaseError("admin.hotmart.mapping_create_failed", error, "Não foi possível vincular o produto.")
  }

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

  if (error) {
    throwSafeDatabaseError("admin.hotmart.mapping_status_failed", error, "Não foi possível alterar o mapeamento.")
  }
  if (!data) throw new Error("Mapeamento Hotmart inválido para este curso.")

  revalidatePath(`/admin/cursos/${courseId}`)
}

// ---------------------------------------------------------------------------
// Ofertas autorizadas por produto
// ---------------------------------------------------------------------------

async function assertMappingInCourse(supabase: any, courseId: string, mappingId: string) {
  const { data, error } = await supabase
    .from("hotmart_product_mappings")
    .select("id")
    .eq("id", mappingId)
    .eq("course_id", courseId)
    .maybeSingle()
  if (error) {
    throwSafeDatabaseError("admin.hotmart.mapping_lookup_failed", error, "Não foi possível verificar o produto.")
  }
  if (!data) throw new Error("Produto Hotmart inválido para este curso.")
}

export async function setHotmartOfferPolicy(
  courseId: string,
  mappingId: string,
  policy: "any" | "authorized_offers",
) {
  const { supabase } = await requireAdmin()
  if (policy !== "any" && policy !== "authorized_offers") throw new Error("Regra de oferta inválida.")
  await assertMappingInCourse(supabase, courseId, mappingId)

  const { error } = await supabase
    .from("hotmart_product_mappings")
    .update({ offer_policy: policy })
    .eq("id", mappingId)
    .eq("course_id", courseId)
  if (error) {
    throwSafeDatabaseError("admin.hotmart.offer_policy_failed", error, "Não foi possível alterar a regra de ofertas.")
  }
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function addHotmartOfferRule(
  courseId: string,
  mappingId: string,
  input: { offer: string; grantsAccess: boolean; label: string },
) {
  const { supabase, userId } = await requireAdmin()
  await assertMappingInCourse(supabase, courseId, mappingId)
  if (typeof input.grantsAccess !== "boolean") throw new Error("Informe se a oferta libera o acesso.")
  const offerCode = parseOfferInput(input.offer)
  if (!offerCode) throw new Error("Informe o código da oferta (ex.: 4e4p713s) ou o link do checkout com ?off=.")
  const label = input.label.trim().slice(0, 120) || null

  const { error } = await supabase.from("hotmart_offer_rules").insert({
    mapping_id: mappingId,
    offer_code: offerCode,
    grants_access: input.grantsAccess,
    label,
    created_by: userId,
  })
  if (error?.code === "23505") throw new Error("Esta oferta já está cadastrada para o produto.")
  if (error) {
    throwSafeDatabaseError("admin.hotmart.offer_create_failed", error, "Não foi possível cadastrar a oferta.")
  }
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function removeHotmartOfferRule(courseId: string, mappingId: string, ruleId: string) {
  const { supabase } = await requireAdmin()
  await assertMappingInCourse(supabase, courseId, mappingId)

  const { data, error } = await supabase
    .from("hotmart_offer_rules")
    .delete()
    .eq("id", ruleId)
    .eq("mapping_id", mappingId)
    .select("id")
    .maybeSingle()
  if (error) {
    throwSafeDatabaseError("admin.hotmart.offer_delete_failed", error, "Não foi possível remover a oferta.")
  }
  if (!data) throw new Error("Oferta não encontrada para este produto.")
  revalidatePath(`/admin/cursos/${courseId}`)
}
