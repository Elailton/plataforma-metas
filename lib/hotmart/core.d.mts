export type EnrollmentStatus = "active" | "suspended" | "revoked"
export type EventProcessingStatus = "processing" | "processed" | "failed" | "ignored"

export interface ParsedHotmartEvent {
  eventId: string
  eventType: string
  version: "2.0.0"
  status: EnrollmentStatus | null
  transaction: string | null
  productUcode: string | null
  buyerEmail: string | null
  buyerName: string | null
  avatarInitials: string
}

export interface HotmartRepository {
  claimEvent(event: ParsedHotmartEvent): Promise<{ claimed: boolean; status: EventProcessingStatus }>
  finishEvent(eventId: string, status: "processed" | "ignored", message: string | null): Promise<void>
  failEvent(eventId: string, message: string): Promise<void>
  findActiveMapping(productUcode: string | null): Promise<{ courseId: string } | null>
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
  upsertEnrollment(input: {
    userId: string
    courseId: string
    status: "active"
  }): Promise<void>
  updateEnrollmentStatus(input: {
    userId: string
    courseId: string
    status: EnrollmentStatus
  }): Promise<void>
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
  enrollmentStatus?: EnrollmentStatus
}>





