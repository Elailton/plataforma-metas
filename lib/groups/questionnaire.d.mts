export const groupLabels: Record<number, string>
export interface QuestionnairePayload {
  version: string
  name: string
  whatsapp: string
  answers: Record<string, unknown>
  labels: Record<string, string>
}
export function groupFromAvailability(value: unknown): 1 | 2
export function normalizeSubmission(input: unknown): {
  email: string
  submissionId: string
  group: 1 | 2
  payload: QuestionnairePayload
}
export function studySummary(
  payload: QuestionnairePayload | null | undefined,
): string[]
