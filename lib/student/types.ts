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

export type TopicImportance = "high" | "medium" | "low"

export interface StudentGoalItem {
  id: string
  subjectId: string
  subjectName: string
  topicId: string | null
  topicName: string | null
  subtopicId: string | null
  subtopicName: string | null
  /** Importância do subtópico (ou, sem ela, do tópico) no edital; null = sem selo. */
  importance: TopicImportance | null
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
  isReleased: boolean
  items: StudentGoalItem[]
  completedItems: number
  totalItems: number
  progress: number
  progressStatus: StudentGoalStatus
}

/** Meta resumida para listas (sem itens e materiais). */
export interface StudentGoalSummary {
  id: string
  number: number
  title: string
  dueDate: string | null
  isReleased: boolean
  progress: number
  progressStatus: StudentGoalStatus
  subjectNames: string[]
}

export interface StudentTopic {
  id: string
  parentTopicId: string | null
  title: string
  position: number
  studied: boolean
  subtopics: StudentTopic[]
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
