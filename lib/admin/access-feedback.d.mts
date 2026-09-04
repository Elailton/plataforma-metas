export type AccessStatus = "active" | "suspended" | "revoked"
export function effectiveAccessStatus(value: unknown): AccessStatus
export function normalizeBlockReason(value: unknown): string
export function manualAccessMessage(requested: AccessStatus, effective: AccessStatus): string
export function blockAccessMessage(blocked: boolean, effective: AccessStatus): string
