import "server-only"

import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, type CurrentProfile } from "@/lib/supabase/queries"
import type {
  StudentCourse,
  StudentCourseSnapshot,
  StudentGoal,
  StudentGoalItem,
  StudentMaterial,
  StudentSubjectProgress,
} from "@/lib/student/types"
import { calculatePercentage, collectStudiedTopicIds, getGoalProgressStatus } from "@/lib/student/core.mjs"

export const STUDENT_COURSE_COOKIE = "student_course_id"

export interface StudentContext {
  profile: CurrentProfile
  courses: StudentCourse[]
  currentCourse: StudentCourse
}

export async function getStudentContext(): Promise<StudentContext | null> {
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
}

export async function getStudentCourseSnapshot(courseId: string): Promise<StudentCourseSnapshot | null> {
  const context = await getStudentContext()
  const course = context?.courses.find((candidate) => candidate.id === courseId)
  if (!context || !course) return null

  const supabase = await createClient()

  const [{ data: courseRow, error: courseError }, { data: subjects, error: subjectsError }, { data: goals, error: goalsError }] =
    await Promise.all([
      supabase.from("courses").select("id, name, slug, organization, cover_color").eq("id", courseId).single(),
      supabase.from("subjects").select("id, name, position").eq("course_id", courseId).order("position"),
      supabase
        .from("goals")
        .select("id, course_id, title, description, due_date, created_at")
        .eq("course_id", courseId)
        .eq("status", "published")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
    ])

  if (courseError || subjectsError || goalsError || !courseRow) {
    throw new Error("Não foi possível carregar o curso do aluno.")
  }

  const subjectIds = (subjects ?? []).map((subject) => subject.id)
  const goalIds = (goals ?? []).map((goal) => goal.id)

  const [{ data: topics, error: topicsError }, { data: items, error: itemsError }] = await Promise.all([
    subjectIds.length
      ? supabase
          .from("syllabus_topics")
          .select("id, subject_id, title, position")
          .in("subject_id", subjectIds)
          .order("position")
      : Promise.resolve({ data: [], error: null }),
    goalIds.length
      ? supabase
          .from("goal_items")
          .select("id, goal_id, subject_id, topic_id, instructions, suggested_questions, position")
          .in("goal_id", goalIds)
          .order("position")
      : Promise.resolve({ data: [], error: null }),
  ])

  if (topicsError || itemsError) throw new Error("Não foi possível carregar as metas do aluno.")

  const itemIds = (items ?? []).map((item) => item.id)
  const [{ data: completionRows, error: completionsError }, { data: itemMaterials, error: itemMaterialsError }] =
    await Promise.all([
      itemIds.length
        ? supabase
            .from("student_goal_item_completions")
            .select("goal_item_id")
            .eq("user_id", context.profile.id)
            .in("goal_item_id", itemIds)
        : Promise.resolve({ data: [], error: null }),
      itemIds.length
        ? supabase
            .from("goal_item_materials")
            .select("goal_item_id, material_id, position")
            .in("goal_item_id", itemIds)
            .order("position")
        : Promise.resolve({ data: [], error: null }),
    ])

  const isMissingProgressRelation = (error: { code?: string; message?: string } | null) =>
    Boolean(error && (error.code === "PGRST205" || error.code === "42P01" || /does not exist|Could not find the table/i.test(error.message ?? "")))

  if (completionsError && !isMissingProgressRelation(completionsError)) {
    console.error("[v0] Falha ao carregar conclusões do aluno:", completionsError)
    throw new Error("Não foi possível carregar o progresso do aluno.")
  }

  if (itemMaterialsError && !isMissingProgressRelation(itemMaterialsError)) {
    console.error("[v0] Falha ao carregar materiais vinculados:", itemMaterialsError)
    throw new Error("Não foi possível carregar os materiais das metas.")
  }

  const safeCompletionRows = completionsError ? [] : completionRows ?? []
  const safeItemMaterials = itemMaterialsError ? [] : itemMaterials ?? []
  const materialIds = [...new Set(safeItemMaterials.map((relation) => relation.material_id))]
  const { data: materials, error: materialsError } = materialIds.length
    ? await supabase.from("materials").select("id, title, type, url").in("id", materialIds)
    : { data: [], error: null }

  if (materialsError) throw new Error("Não foi possível carregar os materiais das metas.")

  const completedItemIds = new Set(safeCompletionRows.map((completion) => completion.goal_item_id))
  const subjectById = new Map((subjects ?? []).map((subject) => [subject.id, subject]))
  const topicById = new Map((topics ?? []).map((topic) => [topic.id, topic]))
  const materialById = new Map(
    (materials ?? []).map((material) => [
      material.id,
      {
        id: material.id,
        title: material.title,
        type: material.type,
        url: material.url,
      } satisfies StudentMaterial,
    ]),
  )

  const mappedGoals: StudentGoal[] = (goals ?? []).map((goal, index) => {
    const mappedItems: StudentGoalItem[] = (items ?? [])
      .filter((item) => item.goal_id === goal.id)
      .map((item) => {
        const subject = subjectById.get(item.subject_id)
        const topic = item.topic_id ? topicById.get(item.topic_id) : null
        const linkedMaterials = safeItemMaterials
          .filter((relation) => relation.goal_item_id === item.id)
          .map((relation) => materialById.get(relation.material_id))
          .filter((material): material is StudentMaterial => Boolean(material))

        return {
          id: item.id,
          subjectId: item.subject_id,
          subjectName: subject?.name ?? "Disciplina",
          topicId: item.topic_id,
          topicName: topic?.title ?? null,
          instructions: item.instructions,
          suggestedQuestions: item.suggested_questions,
          materials: linkedMaterials,
          completed: completedItemIds.has(item.id),
        }
      })

    const completedItems = mappedItems.filter((item) => item.completed).length
    const totalItems = mappedItems.length
    const progress = calculatePercentage(completedItems, totalItems)

    return {
      id: goal.id,
      courseId: goal.course_id,
      number: index + 1,
      title: goal.title,
      description: goal.description,
      dueDate: goal.due_date,
      items: mappedItems,
      completedItems,
      totalItems,
      progress,
      progressStatus: getGoalProgressStatus(completedItems, totalItems),
    }
  })

  const studiedTopicIds = collectStudiedTopicIds(mappedGoals.flatMap((goal) => goal.items))

  const mappedSubjects: StudentSubjectProgress[] = (subjects ?? []).map((subject) => {
    const mappedTopics = (topics ?? [])
      .filter((topic) => topic.subject_id === subject.id)
      .map((topic) => ({
        id: topic.id,
        title: topic.title,
        position: topic.position,
        studied: studiedTopicIds.has(topic.id),
      }))
    const studied = mappedTopics.filter((topic) => topic.studied).length

    return {
      id: subject.id,
      name: subject.name,
      position: subject.position,
      topics: mappedTopics,
      studied,
      total: mappedTopics.length,
      percentage: calculatePercentage(studied, mappedTopics.length),
    }
  })

  const totalTopics = mappedSubjects.reduce((total, subject) => total + subject.total, 0)
  const studiedTopics = mappedSubjects.reduce((total, subject) => total + subject.studied, 0)

  return {
    course: {
      id: courseRow.id,
      name: courseRow.name,
      slug: courseRow.slug,
      organization: courseRow.organization,
      coverColor: courseRow.cover_color,
    },
    goals: mappedGoals,
    subjects: mappedSubjects,
    studiedTopics,
    totalTopics,
    editalPercentage: calculatePercentage(studiedTopics, totalTopics),
  }
}
