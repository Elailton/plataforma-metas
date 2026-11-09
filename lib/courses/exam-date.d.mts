export function todayInBrazil(now?: Date): string
export function isIsoDate(value: unknown): value is string
export function daysUntilExam(examDate: string | null | undefined, now?: Date): number | null
export function examCountdown(
  examDate: string | null | undefined,
  confirmed: boolean,
  now?: Date,
): { days: number; label: string; date: string; status: "confirmada" | "prevista" } | null
export const RETA_FINAL_DAYS: number
export function isRetaFinalOpen(examDate: string | null | undefined, now?: Date): boolean
