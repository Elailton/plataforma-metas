export type EnrollmentStatus = "active" | "suspended" | "revoked"
export type EventProcessingStatus = "processing" | "processed" | "failed" | "ignored"

export interface ParsedHotmartEvent {
  eventId: string
  eventType: string
  version: "2.0.0"
  status: EnrollmentStatus | null
  transaction: string | null
  productUcode: string | null
  productId: string | null
  buyerUcode: string | null
  buyerEmail: string | null
  buyerName: string | null
  avatarInitials: string
  eventCreationDate: string | null
}

export interface HotmartRepository {
  claimEvent(event: ParsedHotmartEvent): Promise<{ claimed: boolean; status: EventProcessingStatus }>
  finishEvent(eventId: string, status: "processed" | "ignored", message: string | null): Promise<void>
  failEvent(eventId: string, message: string): Promise<void>
  findProductMapping(productUcode: string | null): Promise<{ courseId: string; active: boolean } | null>
  findUserByEmail(email: string | null): Promise<string | null>
  inviteStudent(input: {
    email: string
    fullName: string | null
    avatarInitials: string
  }): Promise<string>
  ensureStudentProfile(
    userId: string,
    input: { fullName: string | null; avatarInitials: string },
  ): Promise<"student" | "admin">
  getProfileRole(userId: string): Promise<"student" | "admin" | null>
  findEntitlement(transaction: string): Promise<{
    userId: string | null
    courseId: string
    productUcode: string
    status: EnrollmentStatus
    eventCreationDate: string
  } | null>
  applyEntitlementEvent(input: {
    transaction: string
    userId: string | null
    courseId: string
    productUcode: string
    productId: string | null
    buyerUcode: string | null
    status: EnrollmentStatus
    eventId: string
    eventCreationDate: string
  }): Promise<{
    applied: boolean
    entitlementStatus: EnrollmentStatus
    enrollmentStatus: EnrollmentStatus | null
  }>
}

export class HotmartPayloadError extends Error {}
export class HotmartConflictError extends Error {}

export function normalizeEmail(value: unknown): string
export function initialsFromName(value: unknown): string
export function parseHotmartEvent(payload: unknown): ParsedHotmartEvent
export function processHotmartEvent(
  payload: unknown,
  repository: HotmartRepository,
): Promise<{
  outcome: "processed" | "ignored" | "duplicate"
  eventId: string
  previousStatus?: EventProcessingStatus
  userId?: string | null
  courseId?: string
  entitlementStatus?: EnrollmentStatus
  enrollmentStatus?: EnrollmentStatus | null
}>
