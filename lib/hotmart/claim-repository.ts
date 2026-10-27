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

  // Registros que a própria plataforma recebeu pelo webhook, por transação.
  async function findByTransaction(transaction: string) {
    const [{ data: ent, error: entError }, { data: events, error: evError }] = await Promise.all([
      admin.from("hotmart_entitlements").select("user_id, status").eq("transaction", transaction).maybeSingle(),
      admin.from("hotmart_webhook_events").select("product_ucode, offer_code, event_type, created_at")
        .eq("transaction", transaction).order("created_at", { ascending: false }).limit(20),
    ])
    if (entError || evError) throw new Error("Falha ao consultar os registros da compra.")
    let entitlement = null
    if (ent) {
      let email: string | null = null
      let role: string | null = null
      if (ent.user_id) {
        const [{ data: userData }, { data: profile }] = await Promise.all([
          admin.auth.admin.getUserById(ent.user_id),
          admin.from("profiles").select("role").eq("id", ent.user_id).maybeSingle(),
        ])
        email = userData?.user?.email ?? null
        role = profile?.role ?? null
      }
      entitlement = { status: ent.status as "active" | "suspended" | "revoked", email, role }
    }
    const list = events ?? []
    const event = list.length
      ? {
          productUcode: list.find((row) => row.product_ucode)?.product_ucode ?? null,
          offerCode: list.find((row) => row.offer_code)?.offer_code ?? null,
          latestType: list[0].event_type as string,
        }
      : null
    return entitlement || event ? { entitlement, event } : null
  }

  return claimPurchaseByTransaction(code, {
    local: { findByTransaction },
    sales,
    repository,
    hasActiveStudentAccess: (email) => access.hasActiveStudentAccess(email),
    sendAccessEmail: async (email) => (await access.sendAccessEmail(email)) ?? "sent",
  })
}
