export type StudentGoalStatus = "pending" | "in_progress" | "completed"
export type StudentMaterialType = "videoaula" | "apostila" | "link"

export interface StudentCourse {
  id: string
  name: string
  slug: string
  organization: string | null
  coverColor: string | null
}

export interface StudentMaterial {
  id: string
  title: string
  type: StudentMaterialType
  url: string
}

export interface StudentGoalItem {
  id: string
  subjectId: string
  subjectName: string
  topicId: string | null
  topicName: string | null
  instructions: string | null
  suggestedQuestions: number | null
  materials: StudentMaterial[]
  completed: boolean
}

export interface StudentGoal {
  id: string
  courseId: string
  number: number
  title: string
  description: string | null
  dueDate: string | null
  items: StudentGoalItem[]
  completedItems: number
  totalItems: number
  progress: number
  progressStatus: StudentGoalStatus
}

export interface StudentTopic {
  id: string
  title: string
  position: number
  studied: boolean
}

export interface StudentSubjectProgress {
  id: string
  name: string
  position: number
  topics: StudentTopic[]
  studied: number
  total: number
  percentage: number
}

export interface StudentCourseSnapshot {
  course: StudentCourse
  goals: StudentGoal[]
  subjects: StudentSubjectProgress[]
  studiedTopics: number
  totalTopics: number
  editalPercentage: number
}

