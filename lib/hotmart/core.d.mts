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
  /** data.purchase.offer.code normalizado (minúsculas) ou null quando ausente. */
  offerCode: string | null
}

export type OfferPolicy = "any" | "authorized_offers"
export type OfferVerdict = "granting" | "non_granting" | "unknown" | "missing"

export interface HotmartProductMapping {
  courseId: string
  active: boolean
  /** Ausente equivale a "any" (comportamento anterior). */
  offerPolicy?: OfferPolicy
  offers?: { code: string; grantsAccess: boolean }[]
}

export interface HotmartEventDetails {
  offerCode: string | null
}

export interface HotmartRepository {
  claimEvent(event: ParsedHotmartEvent): Promise<{ claimed: boolean; status: EventProcessingStatus }>
  finishEvent(
    eventId: string,
    status: "processed" | "ignored",
    message: string | null,
    details?: HotmartEventDetails,
  ): Promise<void>
  failEvent(eventId: string, message: string, details?: HotmartEventDetails): Promise<void>
  findProductMapping(productUcode: string | null): Promise<HotmartProductMapping | null>
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
    offerCode?: string | null
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
    offerCode?: string | null
  }): Promise<{
    applied: boolean
    entitlementStatus: EnrollmentStatus
    enrollmentStatus: EnrollmentStatus | null
  }>
}

export class HotmartPayloadError extends Error {}
export class HotmartConflictError extends Error {}

export const OFFER_IGNORED_MESSAGES: Readonly<Record<Exclude<OfferVerdict, "granting">, string>>
export function normalizeOfferCode(value: unknown): string | null
export function evaluateOffer(
  mapping: HotmartProductMapping | null,
  offerCode: string | null,
): { restricted: boolean; verdict: OfferVerdict }
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
  offerCode?: string | null
  offerVerdict?: OfferVerdict
}>
