export const RETAKE_DAYS: number
export const WEAK_TOPIC_THRESHOLD: number
export const WEAK_TOPIC_MIN_QUESTIONS: number
export const ALTERNATIVE_KEYS: readonly ["A", "B", "C", "D", "E"]
export type AlternativeKey = "A" | "B" | "C" | "D" | "E"

export function percentage(correct: number, total: number): number
export function nextAvailableAt(lastSubmittedAt: string | Date | null | undefined): Date | null
export function canAttempt(lastSubmittedAt: string | Date | null | undefined, now?: Date): boolean
export function parseCooldownError(message: unknown): Date | null
export function monthKey(date: string | Date): string
export function isValidMonthKey(value: unknown): value is string

export interface QuizAttemptRow {
  id: string
  quiz_id: string
  attempt_number: number
  correct_count: number
  total_count: number
  submitted_at: string
  month_start: string
  is_first_of_month: boolean
  duration_seconds?: number | null
}

export interface StudentQuizEntry {
  id: string
  title: string
  description: string | null
  questionCount: number
  attemptCount: number
  firstScore: number | null
  lastScore: number | null
  lastAttemptId: string | null
  nextAvailableAt: string | null
  status: "new" | "retake" | "waiting"
  weekNumber: number | null
  releaseDate: string | null
}

export const WEEKLY_GROUP_ID: string

export function groupQuizzesBySubject(input: {
  subjects: Array<{ id: string; name: string; position: number | null }>
  quizzes: Array<{
    id: string
    subject_id: string | null
    title: string
    description?: string | null
    position?: number | null
    week_number?: number | null
    release_date?: string | null
  }>
  questionCounts: Record<string, number>
  attempts: QuizAttemptRow[]
  now?: Date
}): Array<{ id: string; name: string; quizzes: StudentQuizEntry[] }>

export interface DiagnosisTopic {
  id: string
  title: string
  correct: number
  total: number
  percentage: number
}

export interface DiagnosisSubject {
  id: string
  name: string
  correct: number
  total: number
  percentage: number
  topics: DiagnosisTopic[]
  evolution: Array<{ month: string; total: number; percentage: number | null }>
}

export interface Diagnosis {
  months: string[]
  selectedMonth: string | null
  quizzesCounted: number
  overall: { correct: number; total: number; percentage: number }
  subjects: DiagnosisSubject[]
  weakTopics: Array<DiagnosisTopic & { subjectName: string }>
}

export function buildDiagnosis(input: {
  subjects: Array<{ id: string; name: string; position: number | null; topics?: Array<{ id: string; title: string; parent_topic_id?: string | null }> }>
  attempts: Array<Pick<QuizAttemptRow, "id" | "quiz_id" | "month_start" | "is_first_of_month" | "submitted_at">>
  answers: Array<{ attempt_id: string; subject_id: string | null; topic_id: string | null; is_correct: boolean }>
  month?: string | null
}): Diagnosis

export function normalizeAnswers(answers: Record<string, string | null | undefined>, questionIds: string[]): Record<string, AlternativeKey | null>

export function validateQuestionDraft(question: {
  statement: string
  alternatives: Array<{ key: string; text: string }>
  correctKey: string
}): string | null

export function parseQuestionsText(text: string): Array<{
  statement: string
  alternatives: Array<{ key: string; text: string }>
  correctKey: string
  explanation: string
}>
export function isUuid(value: unknown): value is string
export function elapsedSeconds(startedAt: string | Date, now?: Date): number
export function formatClock(seconds: number): string
export function formatDuration(seconds: number | null | undefined): string
