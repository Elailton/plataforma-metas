export const WEAK_PASSWORD_MESSAGE: string
export const SAME_PASSWORD_MESSAGE: string
export const SESSION_EXPIRED_MESSAGE: string
export const GENERIC_PASSWORD_MESSAGE: string
export function passwordErrorMessage(
  error: { code?: string; message?: string; status?: number } | null | undefined,
): string
