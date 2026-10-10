export interface PreviewGoalLike {
  title: string
  status: string
  dueDate: string | null
  description?: string | null
  targetGroups?: number[]
  items?: { instructions?: string | null; suggestedQuestions?: number | null; subjectId?: string | null }[]
}
export function minutesInText(text: string | null | undefined): number
export function summarizeGoal(goal: Pick<PreviewGoalLike, "description" | "items">): {
  minutes: number
  questions: number
  items: number
  itemsWithoutTime: number
  subjects: number
}
export function formatMinutes(minutes: number): string
export function goalsForPreview<T extends PreviewGoalLike>(goals: T[], group: number | null): T[]
export function parsePreviewGroup(value: string | string[] | undefined): 1 | 2 | null
