"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"

const ENROLLMENT_STATUSES = ["active", "suspended", "revoked"] as const
type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export async function enrollExistingStudent(courseId: string, email: string) {
  const { supabase } = await requireAdmin()
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Informe o e-mail válido de uma conta de aluno existente.")
  }

  const { error } = await supabase.rpc("admin_enroll_existing_student", {
    requested_email: normalizedEmail,
    requested_course_id: courseId,
  })

  if (error?.message.includes("Student account not found")) {
    throw new Error("Não encontramos uma conta de aluno com este e-mail.")
  }
  if (error?.message.includes("Only student accounts")) {
    throw new Error("Contas administrativas não podem ser matriculadas.")
  }
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath("/admin/alunos")
}

export async function setEnrollmentStatus(
  enrollmentId: string,
  courseId: string,
  status: EnrollmentStatus,
) {
  const { supabase } = await requireAdmin()
  if (!ENROLLMENT_STATUSES.includes(status)) throw new Error("Status de matrícula inválido.")

  const { data, error } = await supabase.rpc("admin_set_manual_course_grant", {
    requested_enrollment_id: enrollmentId,
    requested_course_id: courseId,
    requested_status: status,
  })

  if (error) throw new Error(error.message)
  if (!data) throw new Error("Matrícula não encontrada neste curso.")

  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath("/admin/alunos")
  revalidatePath("/aluno", "layout")
}
