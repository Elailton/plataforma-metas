export interface EssayRow {
  id: string
  attempt_id: string
  quiz_id: string
  status: "pending" | "graded" | "annulled"
  submitted_at: string
  body: string | null
  image_paths: string[]
  scores: number[] | null
  score_total: number | null
  feedback: string | null
  graded_at: string | null
}

export const ESSAY_CRITERIA: string[]
export const ESSAY_MAX_SCORE: number
export const ESSAY_MIN_SCORE: number
export const ESSAY_REVIEW_DAYS: number
export const ESSAY_MAX_IMAGES: number
export const ESSAY_MAX_BODY: number
export const ESSAY_MAX_IMAGE_BYTES: number
export function essayReviewDeadline(submittedAt: string): Date | null
export function essayStatusLabel(essay: Pick<EssayRow, "status" | "score_total"> | null | undefined): string | null
export function remainingSeconds(limitMinutes: number | null | undefined, elapsed: number): number | null
export function parseEssayScores(values: unknown): number[] | null
export function essayImagePath(userId: string, attemptId: string, index: number, id: string, mime: string): string
export function parseEssayPrompt(prompt: string | null | undefined): { text: string; sheetUrl: string | null }
