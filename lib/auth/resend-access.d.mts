export declare const RESEND_GENERIC_MESSAGE: string
export declare const RESEND_LIMITS: Readonly<{ windowMinutes: number; perEmail: number; perIp: number; global: number }>

export type ResendOutcome = "accepted" | "limited" | "sent" | "skipped" | "failed"

export interface ResendDependencies {
  reserve?(input: { emailHash: string; ipHash: string; requestKey?: string }): Promise<{ accepted: boolean; requestId: number | null }>
  hash(value: string): string
  countRecent(input: { emailHash: string; ipHash: string; since: Date }): Promise<{ email: number; ip: number; total: number }>
  record(input: { emailHash: string; ipHash: string; outcome: "accepted" | "limited" }): Promise<number | null>
  updateOutcome(requestId: number | null, outcome: "sent" | "skipped" | "failed" | "limited"): Promise<void>
  hasActiveStudentAccess(email: string): Promise<boolean>
  /** "cooldown" quando o Auth recusa por envio recente ao mesmo e-mail (HTTP 429). */
  sendAccessEmail(email: string): Promise<"sent" | "cooldown" | void>
}

export declare function normalizeResendEmail(value: unknown): string | null
export declare function clientIpFrom(headers: { get(name: string): string | null } | null | undefined): string
export declare function isRateLimited(
  counts: { email: number; ip: number; total: number },
  limits?: typeof RESEND_LIMITS,
): boolean
export declare function acceptResendRequest(
  input: { email: unknown; ip: string; requestKey?: string; now?: Date },
  deps: ResendDependencies,
): Promise<{
  message: string
  outcome: "invalid" | "limited" | "accepted"
  deliver: (() => Promise<"sent" | "skipped" | "failed" | "limited">) | null
}>
export declare function deliverResend(
  input: { email: string; requestId: number | null },
  deps: ResendDependencies,
): Promise<"sent" | "skipped" | "failed" | "limited">
