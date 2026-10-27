export type ClaimStatus = "invalid" | "not_found" | "not_sga" | "course_only" | "review" | "granted"
export interface ClaimResult {
  status: ClaimStatus
  message: string
  maskedEmail?: string
}
export declare const CLAIM_MESSAGES: Readonly<Record<ClaimStatus | "limited" | "error", string>>
export declare function normalizeTransactionCode(value: unknown): string | null
export declare function maskEmail(email: string | null | undefined): string
export declare function claimPurchaseByTransaction(
  rawCode: unknown,
  deps: {
    sales: { findPaidSaleByTransaction(code: string): Promise<unknown> }
    repository: unknown
    hasActiveStudentAccess(email: string): Promise<boolean>
    sendAccessEmail(email: string): Promise<"sent" | "cooldown" | void>
  },
): Promise<ClaimResult>
