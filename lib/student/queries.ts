import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, type CurrentProfile } from "@/lib/supabase/queries"
import type { StudentCourse, StudentCourseSnapshot, StudentMaterial } from "@/lib/student/types"
import { buildStudentSnapshot, materialsFromRelations, type SnapshotGoalRow, type SnapshotSubjectRow } from "@/lib/student/snapshot.mjs"
import { logSafeServerError } from "@/lib/security/safe-error"

export const STUDENT_COURSE_COOKIE = "student_course_id"

export interface StudentContext {
  profile: CurrentProfile
  courses: StudentCourse[]
  currentCourse: StudentCourse
}

export const getStudentContext = cache(async function getStudentContext(): Promise<StudentContext | null> {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "student") return null

  const courses = profile.enrollments
    .filter((enrollment) => enrollment.status === "active" && enrollment.course?.status === "published")
    .map((enrollment) => ({
      id: enrollment.course!.id,
      name: enrollment.course!.name,
      slug: enrollment.course!.slug,
      organization: null,
      coverColor: null,
    }))

  if (courses.length === 0) return null

  const cookieStore = await cookies()
  const selectedCourseId = cookieStore.get(STUDENT_COURSE_COOKIE)?.value
  const currentCourse = courses.find((course) => course.id === selectedCourseId) ?? courses[0]

  return { profile, courses, currentCourse }
})

// Sem materiais: a lista completa de metas roda em toda página do aluno e os
// materiais (com RLS em cascata) eram a maior parte do custo. Os materiais são
// carregados só na página da meta aberta, por getGoalItemMaterials.
const GOAL_SELECT =
  "id, course_id, title, description, due_date, created_at, goal_items(id, subject_id, topic_id, subtopic_id, instructions, suggested_questions, position, archived_at)"

const isMissingProgressRelation = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === "PGRST205" || error.code === "42P01" || /does not exist|Could not find the table/i.test(error.message ?? "")))

/**
 * Dados do curso para o aluno em uma única rodada de consultas paralelas.
 * O RLS continua decidindo o que é visível (grupo, publicação, itens não arquivados).
 * Cacheado por requisição: layout e página compartilham o mesmo resultado.
 */
export const getStudentCourseSnapshot = cache(async function getStudentCourseSnapshot(
  courseId: string,
): Promise<StudentCourseSnapshot | null> {
  const context = await getStudentContext()
  const course = context?.courses.find((candidate) => candidate.id === courseId)
  if (!context || !course) return null

  const supabase = await createClient()

  const [courseResult, subjectsResult, goalsResult, completionsResult] = await Promise.all([
    supabase.from("courses").select("id, name, slug, organization, cover_color").eq("id", courseId).single(),
    supabase
      .from("subjects")
      .select("id, name, position, syllabus_topics(id, subject_id, parent_topic_id, title, position, importance)")
      .eq("course_id", courseId),
    supabase
      .from("goals")
      .select(GOAL_SELECT)
      .eq("course_id", courseId)
      .eq("status", "published")
      .is("goal_items.archived_at", null),
    supabase.from("student_goal_item_completions").select("goal_item_id").eq("user_id", context.profile.id),
  ])

  const { data: courseRow, error: courseError } = courseResult
  if (courseError || subjectsResult.error || goalsResult.error || !courseRow) {
    logSafeServerError("student.snapshot.read_failed", courseError ?? subjectsResult.error ?? goalsResult.error)
    throw new Error("Não foi possível carregar o curso do aluno.")
  }

  if (completionsResult.error && !isMissingProgressRelation(completionsResult.error)) {
    logSafeServerError("student.completions.read_failed", completionsResult.error)
    throw new Error("Não foi possível carregar o progresso do aluno.")
  }

  const snapshot = buildStudentSnapshot({
    subjects: subjectsResult.data as SnapshotSubjectRow[] | null,
    goals: goalsResult.data as unknown as SnapshotGoalRow[] | null,
    completedItemIds: (completionsResult.error ? [] : completionsResult.data ?? []).map((row) => row.goal_item_id),
  })

  return {
    course: {
      id: courseRow.id,
      name: courseRow.name,
      slug: courseRow.slug,
      organization: courseRow.organization,
      coverColor: courseRow.cover_color,
    },
    ...snapshot,
  }
})

/**
 * Materiais dos itens de uma única meta (a que o aluno abriu). O RLS continua
 * decidindo o que é visível. Devolve um mapa itemId -> materiais em ordem.
 */
export async function getGoalItemMaterials(itemIds: string[]): Promise<Map<string, StudentMaterial[]>> {
  const result = new Map<string, StudentMaterial[]>()
  if (itemIds.length === 0) return result
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("goal_item_materials")
    .select("goal_item_id, position, materials(id, title, type, url)")
    .in("goal_item_id", itemIds)
  if (error) {
    logSafeServerError("student.goal_materials.read_failed", error)
    throw new Error("Não foi possível carregar os materiais da meta.")
  }
  type MaterialRelation = Parameters<typeof materialsFromRelations>[0] extends readonly (infer R)[] | null | undefined ? R : never
  const byItem = new Map<string, MaterialRelation[]>()
  for (const row of data ?? []) {
    const list = byItem.get(row.goal_item_id) ?? []
    list.push(row as unknown as MaterialRelation)
    byItem.set(row.goal_item_id, list)
  }
  for (const id of itemIds) result.set(id, materialsFromRelations(byItem.get(id) ?? []) as StudentMaterial[])
  return result
}
