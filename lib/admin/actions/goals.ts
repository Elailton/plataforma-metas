"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import type { GoalStatus } from "@/lib/admin/types"

export interface GoalItemInput {
  id?: string
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
  updatedAt?: string
  items: GoalItemInput[]
}

function refreshGoal(courseId: string, goalId: string) {
  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath(`/admin/cursos/${courseId}/metas/${goalId}`)
  revalidatePath("/aluno", "layout")
}

async function saveGoal(goalId: string | null, input: GoalFormInput) {
  const { supabase } = await requireAdmin()
  if (!input.title.trim()) throw new Error("Informe o título da meta.")
  if (!input.items.length) throw new Error("Adicione ao menos um item à meta.")

  // The RPC revalidates the admin, goal/course/item relationships and version,
  // then saves everything atomically without deleting any student completion.
  const { data, error } = await supabase.rpc("admin_save_goal", {
    requested_goal_id: goalId,
    requested_course_id: input.courseId,
    requested_updated_at: goalId ? input.updatedAt ?? null : null,
    requested_goal: {
      title: input.title.trim(), description: input.description.trim() || null,
      due_date: input.dueDate, status: input.status,
    },
    requested_items: input.items.map((item) => ({
      id: goalId ? item.id ?? null : null,
      subject_id: item.subjectId, topic_id: item.topicId,
      instructions: item.instructions.trim() || null,
      suggested_questions: item.suggestedQuestions,
      material_ids: [...new Set(item.materialIds)],
    })),
  })
  if (error) throw new Error(error.message)
  if (typeof data !== "string") throw new Error("Não foi possível salvar a meta.")
  refreshGoal(input.courseId, data)
  return data
}

export async function createGoal(input: GoalFormInput) {
  return saveGoal(null, input)
}

export async function updateGoal(goalId: string, input: GoalFormInput) {
  return saveGoal(goalId, input)
}

export async function setGoalStatus(goalId: string, courseId: string, status: GoalStatus) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("goals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", goalId).eq("course_id", courseId).select("id").single()
  if (error) throw new Error(error.message)
  refreshGoal(courseId, goalId)
}

export async function deleteGoal(goalId: string, courseId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("goals").delete()
    .eq("id", goalId).eq("course_id", courseId).select("id").single()
  if (error?.code === "23503") {
    throw new Error("Esta meta possui histórico de alunos. Arquive a meta para preservar o progresso.")
  }
  if (error) throw new Error(error.message)
  refreshGoal(courseId, goalId)
}

export async function duplicateGoal(goalId: string, courseId: string) {
  const { supabase } = await requireAdmin()
  const { data: goal, error: goalError } = await supabase.from("goals")
    .select("*").eq("id", goalId).eq("course_id", courseId).single()
  if (goalError || !goal) throw new Error("Meta não encontrada neste curso.")
  const { data: items, error: itemsError } = await supabase.from("goal_items")
    .select("*, goal_item_materials(material_id, position)")
    .eq("goal_id", goalId).is("archived_at", null).order("position", { ascending: true })
  if (itemsError) throw new Error(itemsError.message)

  return saveGoal(null, {
    courseId, title: `${goal.title} (cópia)`, description: goal.description ?? "",
    dueDate: goal.due_date, status: "draft",
    items: (items ?? []).map((item: any) => ({
      subjectId: item.subject_id, topicId: item.topic_id,
      instructions: item.instructions ?? "", suggestedQuestions: item.suggested_questions,
      materialIds: (item.goal_item_materials ?? [])
        .sort((a: any, b: any) => a.position - b.position).map((m: any) => m.material_id),
    })),
  })
}
