// Tipos que mapeiam diretamente para as tabelas do Supabase usadas pelo CRUD
// administrativo (courses, subjects, syllabus_topics, materials, goals,
// goal_items, goal_item_materials).

export type CourseStatus = "draft" | "published" | "archived"

export interface AdminCourse {
  id: string
  name: string
  slug: string
  organization: string | null
  description: string | null
  coverColor: string
  status: CourseStatus
  createdAt: string
  updatedAt: string
  studentsCount: number
  goalsCount: number
}

export interface AdminSubject {
  id: string
  courseId: string
  name: string
  position: number
  topicsCount: number
}

export interface AdminSyllabusTopic {
  id: string
  subjectId: string
  title: string
  position: number
}

export type AdminMaterialType = "videoaula" | "apostila" | "link"

export interface AdminMaterial {
  id: string
  courseId: string | null
  subjectId: string | null
  title: string
  type: AdminMaterialType
  url: string
  description: string | null
  createdAt: string
}

export type GoalStatus = "draft" | "published"

export interface AdminGoalItemMaterial {
  materialId: string
  position: number
}

export interface AdminGoalItem {
  id: string
  subjectId: string
  topicId: string | null
  instructions: string | null
  suggestedQuestions: number | null
  position: number
  materialIds: string[]
}

export interface AdminGoal {
  id: string
  courseId: string
  title: string
  description: string | null
  status: GoalStatus
  dueDate: string | null
  createdAt: string
  updatedAt: string
  items: AdminGoalItem[]
}

export interface AdminStudent {
  id: string
  userId: string
  fullName: string
  email: string
  avatarInitials: string
  courseId: string
  enrollmentStatus: "active" | "suspended" | "revoked"
  enrolledAt: string
}

export interface HotmartProductMapping {
  id: string
  courseId: string
  hotmartProductId: string | null
  hotmartProductUcode: string
  hotmartProductName: string | null
  active: boolean
  createdAt: string
}
