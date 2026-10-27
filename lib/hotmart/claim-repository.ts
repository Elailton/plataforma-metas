import "server-only"
import { createHotmartSalesClient } from "@/lib/hotmart/sales-api.mjs"
import { claimPurchaseByTransaction, type ClaimResult } from "@/lib/hotmart/claim-purchase.mjs"
import { createHotmartRepository } from "@/lib/hotmart/supabase-repository"
import { createResendAccessDependencies } from "@/lib/auth/resend-access-repository"
import { createAdminClient } from "@/lib/supabase/admin"

// Só o token de acesso da Hotmart fica em memória; respostas de vendas nunca.
const sales = createHotmartSalesClient({ credentials: () => ({
  clientId: process.env.HOTMART_CLIENT_ID,
  clientSecret: process.env.HOTMART_CLIENT_SECRET,
  basic: process.env.HOTMART_BASIC,
}) })

/** Dependências reais do "Encontrar minha compra" (somente servidor). */
export async function claimPurchase(code: string): Promise<ClaimResult> {
  const admin = createAdminClient()
  // A conta é criada sem convite: o único e-mail enviado é o link de acesso,
  // depois de conferido o acesso efetivo.
  const repository = createHotmartRepository({ sendInvitation: false })
  const findMapping = repository.findProductMapping
  // Curso não publicado nunca recebe matrícula por este caminho.
  repository.findProductMapping = async (productUcode: string) => {
    const mapping = await findMapping(productUcode)
    if (!mapping?.active) return null
    const { data, error } = await admin.from("courses").select("status").eq("id", mapping.courseId).maybeSingle()
    if (error) throw new Error("Falha ao consultar o curso.")
    return data?.status === "published" ? mapping : null
  }
  const access = createResendAccessDependencies()
  return claimPurchaseByTransaction(code, {
    sales,
    repository,
    hasActiveStudentAccess: (email) => access.hasActiveStudentAccess(email),
    sendAccessEmail: async (email) => (await access.sendAccessEmail(email)) ?? "sent",
  })
}
