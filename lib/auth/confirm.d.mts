export type AllowedOtpType = "invite"

export const ALLOWED_OTP_TYPES: readonly AllowedOtpType[]
export const ALLOWED_NEXT_PATHS: readonly string[]
export const DEFAULT_NEXT_PATH: string

export type ResolveConfirmRequestResult =
  | { valid: true; tokenHash: string; type: AllowedOtpType; next: string }
  | { valid: false; errorCode: "missing_token" | "invalid_type" }

export function resolveConfirmRequest(input: {
  tokenHash: string | null
  type: string | null
  next?: string | null
}): ResolveConfirmRequestResult
