import type { HotmartProductMapping } from "./core.mjs"

export const REPROCESS_DAILY_LIMIT: number
export const REPROCESS_EVENT_PREFIX: string

export interface ReprocessEventRow {
  eventId: string
  transaction: string | null
  eventType: string
  offerCode: string | null
  buyerEmail: string | null
  productUcode: string | null
  createdAt: string
}

export interface ReprocessItem {
  transaction: string
  productUcode: string
  offerCode: string | null
  email: string
  maskedEmail: string
  hasAccount: boolean
  lastCreatedAt: string
}

export interface ReprocessPreview {
  courseDraft: boolean
  counts: {
    alreadyRegistered: number
    refundedOrCanceled: number
    delayed: number
    notApproved: number
    notGranting: number
    withoutEmail: number
    admin: number
  }
  eligible: ReprocessItem[]
  similar: (ReprocessItem & { similarTo: string })[]
  batch: ReprocessItem[]
  invitesInBatch: number
  usedToday: number
  limit: number
  remainingToday: number
  leftAfterBatch: number
}

export function reprocessEventId(transaction: string): string
export function maskEmail(email: string | null | undefined): string
export function findSimilarAccountEmail(email: string, accountEmails: string[]): string | null
export function buildReprocessPreview(input: {
  events: ReprocessEventRow[]
  mappings: Map<string, HotmartProductMapping>
  entitledTransactions: Set<string>
  accounts: Map<string, "student" | "admin" | null>
  courseStatus: string
  usedToday?: number
  limit?: number
}): ReprocessPreview
export function reprocessPayload(item: ReprocessItem): Record<string, unknown>
export function runReprocessBatch(input: {
  preview: ReprocessPreview
  confirmedTransactions: string[]
  process: (payload: Record<string, unknown>) => Promise<{ outcome: string }>
}): Promise<{
  status: "draft" | "done"
  processed: number
  skipped: number
  failed: number
  remainingToday: number
  leftPending?: number
}>
