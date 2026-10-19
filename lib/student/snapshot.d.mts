import type { StudentGoal, StudentGoalSummary, StudentSubjectProgress } from "./types"

export interface SnapshotTopicRow {
  id: string
  subject_id?: string
  parent_topic_id: string | null
  title: string
  position: number
  importance?: string | null
}
export interface SnapshotSubjectRow {
  id: string
  name: string
  position: number
  syllabus_topics: SnapshotTopicRow[] | null
}
export interface SnapshotMaterialRow {
  id: string
  title: string
  type: string
  url: string
}
export interface SnapshotItemRow {
  id: string
  subject_id: string
  topic_id: string | null
  subtopic_id?: string | null
  instructions: string | null
  suggested_questions: number | null
  position: number
  archived_at?: string | null
  goal_item_materials: { position: number; materials: SnapshotMaterialRow | null }[] | null
}
export interface SnapshotGoalRow {
  id: string
  course_id: string
  title: string
  description: string | null
  due_date: string | null
  created_at: string | null
  goal_items: SnapshotItemRow[] | null
}

export function compareGoalsByRelease(
  a: Pick<SnapshotGoalRow, "due_date" | "created_at" | "title">,
  b: Pick<SnapshotGoalRow, "due_date" | "created_at" | "title">,
): number
export function buildStudentSnapshot(input: {
  subjects: SnapshotSubjectRow[] | null
  goals: SnapshotGoalRow[] | null
  completedItemIds: Iterable<string>
  now?: Date
}): {
  goals: StudentGoal[]
  subjects: StudentSubjectProgress[]
  studiedTopics: number
  totalTopics: number
  editalPercentage: number
}
export function toGoalSummary(goal: StudentGoal): StudentGoalSummary
export function isGoalComplete(goal: { totalItems: number; completedItems: number }): boolean
export function withSequentialRelease<T extends { isDateReleased: boolean; totalItems: number; completedItems: number }>(
  goal: T,
  index: number,
  list: T[],
): T & { isReleased: boolean; lockReason: "previous" | "date" | null }
export const GOAL_PREVIEW_WINDOW: number
export function studentGoalWindow<T extends { isReleased: boolean; isDateReleased: boolean; totalItems: number; completedItems: number }>(
  goals: T[],
  limit?: number,
  preview?: number,
): { next: T | null; upcoming: T[]; recent: T[]; earlier: T[]; visible: T[]; releasedCount: number }
