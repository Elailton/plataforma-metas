// Tipos centrais da plataforma.
// Tudo é modelado em torno de `courseId` para que nenhuma regra fique
// amarrada a um concurso específico. Quando o backend (Supabase) entrar,
// estas interfaces devem mapear diretamente para as tabelas do banco.

export type UserRole = "student" | "admin"

export interface Course {
  id: string
  name: string
  organization: string
  shortName: string
  coverColor: string
  studentsCount: number
  goalsCount: number
  published: boolean
}

export interface Student {
  id: string
  name: string
  email: string
  courseId: string
  avatarInitials: string
  joinedAt: string
}

export interface Discipline {
  id: string
  courseId: string
  name: string
}

export interface EditalTopic {
  id: string
  disciplineId: string
  courseId: string
  name: string
  studied: boolean
}

export type MaterialType = "videoaula" | "apostila" | "link"

export interface Material {
  id: string
  courseId: string
  title: string
  disciplineId: string
  type: MaterialType
  url: string
}

export type ChecklistKey = "studied" | "watchedLesson" | "consultedMaterial" | "solvedQuestions"

export interface GoalItem {
  id: string
  disciplineId: string
  topicId: string
  orientation: string
  lessonUrl?: string
  materialUrl?: string
  suggestedQuestions: number
  checklist: Record<ChecklistKey, boolean>
}

export type GoalStatus = "pending" | "in_progress" | "completed"

export interface Goal {
  id: string
  courseId: string
  number: number
  title: string
  date: string
  description: string
  published: boolean
  items: GoalItem[]
}
