"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import { logSafeServerError } from "@/lib/security/safe-error"
import { loadReprocessPreview, runReprocess } from "@/lib/hotmart/reprocess-repository"
import type { ReprocessItem, ReprocessPreview } from "@/lib/hotmart/reprocess.mjs"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TRANSACTION = /^[A-Za-z0-9_-]{1,64}$/

export type ReprocessListItem = Pick<ReprocessItem, "transaction" | "maskedEmail" | "hasAccount">

export interface ReprocessPreviewView extends Omit<ReprocessPreview, "eligible" | "similar" | "batch"> {
  eligibleCount: number
  batch: ReprocessListItem[]
  similar: (ReprocessListItem & { similarTo: string })[]
}

// O navegador recebe só e-mails mascarados; o e-mail completo nunca sai do servidor.
function toView(preview: ReprocessPreview): ReprocessPreviewView {
  const strip = ({ transaction, maskedEmail, hasAccount }: ReprocessItem): ReprocessListItem =>
    ({ transaction, maskedEmail, hasAccount })
  const { eligible, similar, batch, ...rest } = preview
  return {
    ...rest,
    eligibleCount: eligible.length,
    batch: batch.map(strip),
    similar: similar.map((item) => ({ ...strip(item), similarTo: item.similarTo })),
  }
}

function assertCourseId(courseId: string) {
  if (!UUID.test(courseId)) throw new Error("Curso inválido.")
}

export async function previewPendingPurchases(courseId: string): Promise<ReprocessPreviewView> {
  assertCourseId(courseId)
  await requireAdmin()
  try {
    return toView(await loadReprocessPreview(courseId))
  } catch (error) {
    logSafeServerError("admin.hotmart.reprocess_preview_failed", error)
    throw new Error("Não foi possível montar a prévia das compras pendentes.")
  }
}

export async function reprocessPendingPurchases(courseId: string, confirmedTransactions: string[], confirmed: boolean) {
  assertCourseId(courseId)
  await requireAdmin()
  if (confirmed !== true) throw new Error("Confirme antes de liberar.")
  const list = Array.isArray(confirmedTransactions)
    ? confirmedTransactions.filter((value) => typeof value === "string" && TRANSACTION.test(value)).slice(0, 50)
    : []
  if (!list.length) throw new Error("Nenhuma compra selecionada.")
  try {
    const result = await runReprocess(courseId, list)
    revalidatePath(`/admin/cursos/${courseId}`)
    return result
  } catch (error) {
    logSafeServerError("admin.hotmart.reprocess_failed", error)
    throw new Error("Não foi possível reprocessar as compras agora.")
  }
}
