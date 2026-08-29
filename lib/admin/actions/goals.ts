"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import type { GoalStatus } from "@/lib/admin/types"

export interface GoalItemInput {
  subjectId: string
  topicId: string | null
  instructions: string
  suggestedQuestions: number | null
  materialIds: string[]
}

export interface GoalFormInput {
  courseId: string
  title: string
  description: string
  dueDate: string | null
  status: GoalStatus
  items: GoalItemInput[]
}

async function validateItems(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  courseId: string,
  items: GoalItemInput[],
) {
  if (items.length === 0) throw new Error("Adicione ao menos um item à meta.")

  const subjectIds = [...new Set(items.map((item) => item.subjectId))]
  const { data: subjects } = await supabase.from("subjects").select("id, course_id").in("id", subjectIds)

  for (const item of items) {
    const subject = subjects?.find((s) => s.id === item.subjectId)
    if (!subject || subject.course_id !== courseId) {
      throw new Error("Uma das disciplinas selecionadas não pertence a este curso.")
    }
  }

  const topicIds = items.map((item) => item.topicId).filter((id): id is string => Boolean(id))
  if (topicIds.length > 0) {
    const { data: topics } = await supabase.from("syllabus_topics").select("id, subject_id").in("id", topicIds)
    for (const item of items) {
      if (!item.topicId) continue
      const topic = topics?.find((t) => t.id === item.topicId)
      if (!topic || topic.subject_id !== item.subjectId) {
        throw new Error("Um dos tópicos selecionados não pertence à disciplina escolhida.")
      }
    }
  }

  const materialIds = [...new Set(items.flatMap((item) => item.materialIds))]
  if (materialIds.length > 0) {
    const { data: materials } = await supabase.from("materials").select("id, course_id").in("id", materialIds)
    for (const id of materialIds) {
      const material = materials?.find((m) => m.id === id)
      if (!material || (material.course_id && material.course_id !== courseId)) {
        throw new Error("Um dos materiais vinculados não pertence a este curso.")
      }
    }
  }
}

async function replaceGoalItems(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  goalId: string,
  items: GoalItemInput[],
) {
  const { error: deleteError } = await supabase.from("goal_items").delete().eq("goal_id", goalId)
  if (deleteError) throw new Error(deleteError.message)

  for (let index = 0; index < items.length; index++) {
    const item = items[index]

    const { data: insertedItem, error: itemError } = await supabase
      .from("goal_items")
      .insert({
        goal_id: goalId,
        subject_id: item.subjectId,
        topic_id: item.topicId,
        instructions: item.instructions.trim() || null,
        suggested_questions: item.suggestedQuestions,
        position: index,
      })
      .select("id")
      .single()

    if (itemError) throw new Error(itemError.message)

    if (item.materialIds.length > 0) {
      const rows = item.materialIds.map((materialId, position) => ({
        goal_item_id: insertedItem.id,
        material_id: materialId,
        position,
      }))
      const { error: materialsError } = await supabase.from("goal_item_materials").insert(rows)
      if (materialsError) throw new Error(materialsError.message)
    }
  }
}

export async function createGoal(input: GoalFormInput) {
  const { supabase } = await requireAdmin()

  const title = input.title.trim()
  if (!title) throw new Error("Informe o título da meta.")

  await validateItems(supabase, input.courseId, input.items)

  const { data: goal, error } = await supabase
    .from("goals")
    .insert({
      course_id: input.courseId,
      title,
      description: input.description.trim() || null,
      due_date: input.dueDate,
      status: input.status,
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)

  await replaceGoalItems(supabase, goal.id, input.items)

  revalidatePath(`/admin/cursos/${input.courseId}`)
  return goal.id as string
}

export async function updateGoal(goalId: string, input: GoalFormInput) {
  const { supabase } = await requireAdmin()

  const title = input.title.trim()
  if (!title) throw new Error("Informe o título da meta.")

  await validateItems(supabase, input.courseId, input.items)

  const { error } = await supabase
    .from("goals")
    .update({
      title,
      description: input.description.trim() || null,
      due_date: input.dueDate,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId)

  if (error) throw new Error(error.message)

  await replaceGoalItems(supabase, goalId, input.items)

  revalidatePath(`/admin/cursos/${input.courseId}`)
  revalidatePath(`/admin/cursos/${input.courseId}/metas/${goalId}`)
}

export async function setGoalStatus(goalId: string, courseId: string, status: GoalStatus) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from("goals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", goalId)

  if (error) throw new Error(error.message)

  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath(`/admin/cursos/${courseId}/metas/${goalId}`)
}

export async function deleteGoal(goalId: string, courseId: string) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from("goals").delete().eq("id", goalId)
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function duplicateGoal(goalId: string, courseId: string) {
  const { supabase } = await requireAdmin()

  const { data: goal } = await supabase.from("goals").select("*").eq("id", goalId).single()
  if (!goal) throw new Error("Meta não encontrada.")

  const { data: items } = await supabase
    .from("goal_items")
    .select("*, goal_item_materials(material_id, position)")
    .eq("goal_id", goalId)
    .order("position", { ascending: true })

  const { data: newGoal, error } = await supabase
    .from("goals")
    .insert({
      course_id: goal.course_id,
      title: `${goal.title} (cópia)`,
      description: goal.description,
      due_date: goal.due_date,
      status: "draft",
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)

  const goalItems: GoalItemInput[] = (items ?? []).map((item: any) => ({
    subjectId: item.subject_id,
    topicId: item.topic_id,
    instructions: item.instructions ?? "",
    suggestedQuestions: item.suggested_questions,
    materialIds: (item.goal_item_materials ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((m: any) => m.material_id),
  }))

  if (goalItems.length > 0) {
    await replaceGoalItems(supabase, newGoal.id, goalItems)
  }

  revalidatePath(`/admin/cursos/${courseId}`)
  return newGoal.id as string
}
