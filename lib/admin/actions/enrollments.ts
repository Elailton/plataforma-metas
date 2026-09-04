"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import { effectiveAccessStatus, normalizeBlockReason, manualAccessMessage, blockAccessMessage } from "@/lib/admin/access-feedback.mjs"

const ENROLLMENT_STATUSES = ["active", "suspended", "revoked"] as const
type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export async function enrollExistingStudent(courseId: string, email: string) {
  const { supabase } = await requireAdmin()
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Informe o e-mail válido de uma conta de aluno existente.")
  }

  const { data: enrollmentId, error } = await supabase.rpc("admin_enroll_existing_student", {
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

  const { data: enrollment, error: readError } = await supabase.from("enrollments")
    .select("status").eq("id", enrollmentId).eq("course_id", courseId).single()
  if (readError) throw new Error("Concessão salva, mas não foi possível conferir o acesso. Recarregue a página.")
  const effectiveStatus = effectiveAccessStatus(enrollment?.status)
  refreshAccessPages(courseId)
  return { effectiveStatus, message: manualAccessMessage("active", effectiveStatus) }
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
  const effectiveStatus = effectiveAccessStatus(data)
  refreshAccessPages(courseId)
  return { effectiveStatus, message: manualAccessMessage(status, effectiveStatus) }
}

export async function setCourseAccessBlock(
  enrollmentId: string,
  courseId: string,
  blocked: boolean,
  reason: string,
) {
  const { supabase } = await requireAdmin()
  if (typeof blocked !== "boolean") throw new Error("Ação de bloqueio inválida.")
  const { data, error } = await supabase.rpc("admin_set_course_access_block", {
    requested_enrollment_id: enrollmentId,
    requested_course_id: courseId,
    requested_blocked: blocked,
    requested_reason: normalizeBlockReason(reason),
  })
  if (error) throw new Error("Não foi possível alterar o bloqueio. Confira a matrícula, suas permissões e a migration do banco.")
  const effectiveStatus = effectiveAccessStatus(data)
  refreshAccessPages(courseId)
  return { effectiveStatus, message: blockAccessMessage(blocked, effectiveStatus) }
}

function refreshAccessPages(courseId: string) {
  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath("/admin/alunos")
  revalidatePath("/admin")
  revalidatePath("/aluno", "layout")
}
