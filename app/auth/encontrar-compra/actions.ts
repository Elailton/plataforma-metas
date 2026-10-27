"use server"

import { headers } from "next/headers"
import { clientIpFrom } from "@/lib/auth/resend-access.mjs"
import { createResendAccessDependencies } from "@/lib/auth/resend-access-repository"
import { CLAIM_MESSAGES, normalizeTransactionCode, type ClaimStatus } from "@/lib/hotmart/claim-purchase.mjs"
import { claimPurchase } from "@/lib/hotmart/claim-repository"
import { logSafeServerError } from "@/lib/security/safe-error"

export interface FindPurchaseState {
  status: ClaimStatus | "limited" | "error" | null
  message: string | null
}

export async function findPurchase(_previous: FindPurchaseState, formData: FormData): Promise<FindPurchaseState> {
  const code = normalizeTransactionCode(formData.get("code"))
  if (!code) return { status: "invalid", message: CLAIM_MESSAGES.invalid }

  // Mesmos limites atômicos do reenvio de acesso (por código, por IP e global).
  const deps = createResendAccessDependencies()
  let requestId: number | null = null
  try {
    const reservation = await deps.reserve!({
      emailHash: deps.hash(`transaction:${code}`),
      ipHash: deps.hash(`ip:${clientIpFrom(await headers())}`),
    })
    if (!reservation.accepted) return { status: "limited", message: CLAIM_MESSAGES.limited }
    requestId = reservation.requestId
  } catch (error) {
    logSafeServerError("auth.find_purchase.reserve_failed", error)
    return { status: "error", message: CLAIM_MESSAGES.error }
  }

  try {
    const result = await claimPurchase(code)
    await deps.updateOutcome(requestId, result.status === "granted" ? "sent" : "skipped")
    return { status: result.status, message: result.message }
  } catch (error) {
    logSafeServerError("auth.find_purchase.failed", error)
    await deps.updateOutcome(requestId, "failed")
    // Conflito de identidade (transação já ligada a outra conta etc.) precisa de
    // conferência humana; indisponibilidade da Hotmart pode ser tentada de novo.
    const conflict = error instanceof Error && error.name === "HotmartConflictError"
    return conflict
      ? { status: "review", message: CLAIM_MESSAGES.review }
      : { status: "error", message: CLAIM_MESSAGES.error }
  }
}
