"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { STUDENT_COURSE_COOKIE } from "@/lib/student/queries"

export async function selectStudentCourse(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "")
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !courseId) redirect("/auth/login")

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, courses!enrollments_course_id_fkey(status)")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle()

  const linkedCourse = Array.isArray(enrollment?.courses) ? enrollment.courses[0] : enrollment?.courses
  if (!enrollment || linkedCourse?.status !== "published") redirect("/auth/sem-acesso")

  const cookieStore = await cookies()
  cookieStore.set(STUDENT_COURSE_COOKIE, courseId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })

  redirect("/aluno")
}

export async function setGoalItemCompleted(goalItemId: string, completed: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Você precisa estar autenticado.")

  const { data: item } = await supabase
    .from("goal_items")
    .select("id, goal_id")
    .eq("id", goalItemId)
    .maybeSingle()
  if (!item) throw new Error("Item de meta inválido.")

  const { data: goal } = await supabase
    .from("goals")
    .select("course_id, status")
    .eq("id", item.goal_id)
    .maybeSingle()
  if (!goal || goal.status !== "published") throw new Error("Esta meta não está disponível.")

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", goal.course_id)
    .eq("status", "active")
    .maybeSingle()
  if (!enrollment) throw new Error("Sua matrícula não está ativa para este curso.")

  if (completed) {
    const { error } = await supabase.from("student_goal_item_completions").upsert(
      { user_id: user.id, goal_item_id: goalItemId },
      { onConflict: "user_id,goal_item_id", ignoreDuplicates: true },
    )
    if (error) throw new Error("Não foi possível concluir o item.")
  } else {
    const { error } = await supabase
      .from("student_goal_item_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("goal_item_id", goalItemId)
    if (error) throw new Error("Não foi possível reabrir o item.")
  }

  revalidatePath("/aluno", "layout")
}

