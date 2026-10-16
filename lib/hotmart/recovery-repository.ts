import "server-only"
import { createHotmartSalesClient } from "@/lib/hotmart/sales-api.mjs"
import { recoverHotmartPurchases } from "@/lib/hotmart/recover-purchase.mjs"
import { createHotmartRepository } from "@/lib/hotmart/supabase-repository"
import { createAdminClient } from "@/lib/supabase/admin"
import { logSafeServerError } from "@/lib/security/safe-error"

// Warm instances reuse only the bearer token in memory, never buyer responses.
const sales = createHotmartSalesClient({ credentials: () => ({
  clientId: process.env.HOTMART_CLIENT_ID,
  clientSecret: process.env.HOTMART_CLIENT_SECRET,
  basic: process.env.HOTMART_BASIC,
}) })

export async function recoverMissingHotmartAccess(email: string) {
  const admin = createAdminClient()
  const repository = createHotmartRepository({ sendInvitation: false })
  const findMapping = repository.findProductMapping
  // An unpublished course cannot cause account creation through this recovery.
  repository.findProductMapping = async productUcode => {
    const mapping = await findMapping(productUcode)
    if (!mapping?.active) return null
    const { data, error } = await admin.from("courses").select("status").eq("id", mapping.courseId).maybeSingle()
    if (error) throw new Error("Falha ao consultar o curso.")
    return data?.status === "published" ? mapping : null
  }
  try {
    await recoverHotmartPurchases(email, { sales, repository })
  } catch (error) {
    logSafeServerError("hotmart.access_recovery_failed", error)
    throw error
  }
}
