import type { StudentGoal, StudentGoalSummary, StudentSubjectProgress } from "./types"

export interface SnapshotTopicRow {
  id: string
  subject_id?: string
  parent_topic_id: string | null
  title: string
  position: number
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
