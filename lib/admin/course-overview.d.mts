interface OverviewGoal {
  id: string
  title: string
  status: "draft" | "published" | "archived"
  dueDate: string | null
  targetGroups: number[]
  items: unknown[]
}

export interface GoalSummary {
  id: string
  title: string
  dueDate: string | null
  itemCount: number
}

export interface GoalTimeline {
  lastReleased: GoalSummary | null
  next: GoalSummary | null
  upcoming: GoalSummary[]
  releasedCount: number
  scheduledCount: number
  lastDate: string | null
}

export function summarizeGoalTimeline(goals: OverviewGoal[], today: string): GoalTimeline
export function summarizeCourseTimelines(
  goals: OverviewGoal[],
  today: string,
): (GoalTimeline & { group: 1 | 2 | null })[]

export function summarizeStudents(
  students: {
    enrollmentStatus: "active" | "suspended" | "revoked"
    studyGroup: number | null
    neverSignedIn: boolean | null
    accessBlock: unknown | null
  }[],
): {
  total: number
  active: number
  suspended: number
  revoked: number
  byGroup: { 1: number; 2: number; 3: number; none: number }
  neverSignedIn: number
  blocked: number
}

export function summarizeMaterials(materials: { type: string; url: string | null }[]): {
  total: number
  videos: number
  notebooks: number
  pdfs: number
  others: number
}
