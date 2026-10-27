"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import { effectiveAccessStatus, normalizeBlockReason, manualAccessMessage, blockAccessMessage } from "@/lib/admin/access-feedback.mjs"
import { throwSafeDatabaseError } from "@/lib/security/safe-error"
import { createAdminClient } from "@/lib/supabase/admin"
import { inviteRedirectUrl } from "@/lib/auth/invite-url"
import { buildAccessLink } from "@/lib/auth/confirm.mjs"

const ENROLLMENT_STATUSES = ["active", "suspended", "revoked"] as const
type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export async function enrollExistingStudent(courseId: string, email: string, requestedName = "") {
  const { supabase } = await requireAdmin()
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Informe o e-mail válido de uma conta de aluno existente.")
  }

  let { data: enrollmentId, error } = await supabase.rpc("admin_enroll_existing_student", {
    requested_email: normalizedEmail,
    requested_course_id: courseId,
  })

  let invited = false
  let repairedAccount = false
  let recoveryEmailFailed = false
  if (error?.message.includes("Student account not found")) {
    const fullName = requestedName.trim()
    if (!fullName) throw new Error("Informe o nome para criar a nova conta do aluno.")
    const admin = createAdminClient()
    const avatarInitials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: inviteRedirectUrl(),
      data: { full_name: fullName, avatar_initials: avatarInitials, role: "student" },
    })
    if (inviteError) {
      throwSafeDatabaseError("admin.enrollment.invite_failed", inviteError, "Não foi possível criar a conta ou enviar o email de definição de senha.")
    }
    invited = true
    ;({ data: enrollmentId, error } = await supabase.rpc("admin_enroll_existing_student", {
      requested_email: normalizedEmail,
      requested_course_id: courseId,
    }))
  }
  if (error?.message.includes("Only student accounts")) {
    const fullName = requestedName.trim()
    const admin = createAdminClient()
    const authUser = await findAuthUserByEmail(admin, normalizedEmail)

    if (!authUser) {
      throw new Error("A conta de autenticação foi encontrada, mas não pôde ser recuperada. Tente novamente.")
    }

    const { data: existingProfile, error: profileReadError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", authUser.id)
      .maybeSingle()

    if (profileReadError) {
      throwSafeDatabaseError("admin.enrollment.profile_read_failed", profileReadError, "Não foi possível conferir o cadastro do aluno.")
    }
    if (existingProfile?.role && existingProfile.role !== "student") {
      throw new Error("Contas administrativas não podem ser matriculadas.")
    }
    if (!existingProfile) {
      if (!fullName) {
        throw new Error("O cadastro deste e-mail está incompleto. Informe o nome para reparar a conta e liberar o acesso.")
      }
      const avatarInitials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
      const { error: profileInsertError } = await admin.from("profiles").insert({
        id: authUser.id,
        full_name: fullName,
        avatar_initials: avatarInitials,
        role: "student",
      })
      if (profileInsertError) {
        throwSafeDatabaseError("admin.enrollment.profile_repair_failed", profileInsertError, "Não foi possível reparar o cadastro do aluno.")
      }
      repairedAccount = true
      ;({ data: enrollmentId, error } = await supabase.rpc("admin_enroll_existing_student", {
        requested_email: normalizedEmail,
        requested_course_id: courseId,
      }))
    }
  }
  if (error) {
    if (invited) {
      throw new Error("Conta criada e email de definição de senha enviado, mas não foi possível concluir a matrícula. Tente novamente; a conta não será duplicada.")
    }
    throwSafeDatabaseError("admin.enrollment.create_failed", error, "Não foi possível matricular o aluno.")
  }

  const { data: enrollment, error: readError } = await supabase.from("enrollments")
    .select("status").eq("id", enrollmentId).eq("course_id", courseId).single()
  if (readError) throw new Error("Concessão salva, mas não foi possível conferir o acesso. Recarregue a página.")
  const effectiveStatus = effectiveAccessStatus(enrollment?.status)

  if (repairedAccount) {
    const admin = createAdminClient()
    const { error: recoveryError } = await admin.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: inviteRedirectUrl(),
    })
    recoveryEmailFailed = Boolean(recoveryError)
  }

  refreshAccessPages(courseId)
  return {
    effectiveStatus,
    emailWarning: recoveryEmailFailed,
    message: recoveryEmailFailed
      ? "Matrícula liberada e cadastro reparado, mas não foi possível enviar o email de definição de senha. Tente novamente mais tarde."
      : repairedAccount
        ? "Cadastro reparado, matrícula liberada e email de definição de senha reenviado."
        : invited
      ? "Conta criada, matrícula liberada e email de definição de senha enviado."
      : manualAccessMessage("active", effectiveStatus),
  }
}

type AdminAuthClient = ReturnType<typeof createAdminClient>

async function findAuthUserByEmail(admin: AdminAuthClient, email: string) {
  const perPage = 1000
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throwSafeDatabaseError("admin.enrollment.auth_lookup_failed", error, "Não foi possível localizar a conta de autenticação.")
    }
    const user = data.users.find((candidate) => candidate.email?.trim().toLowerCase() === email)
    if (user) return user
    if (data.users.length < perPage) return null
  }
  return null
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

  if (error) {
    throwSafeDatabaseError("admin.enrollment.status_failed", error, "Não foi possível alterar a matrícula.")
  }
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

// Gera um link pessoal de uso único para o administrador enviar ao aluno (por
// exemplo, pelo WhatsApp) quando o e-mail não chega ou o aluno não consegue usá-lo.
// Nenhum e-mail é enviado e o link nunca é registrado em log.
export async function createStudentAccessLink(enrollmentId: string, courseId: string) {
  const { supabase } = await requireAdmin()
  const { data: enrollment, error } = await supabase
    .from("enrollments")
    .select("user_id, status")
    .eq("id", enrollmentId)
    .eq("course_id", courseId)
    .maybeSingle()
  if (error || !enrollment) throw new Error("Matrícula não encontrada neste curso.")
  if (enrollment.status !== "active") {
    throw new Error("O link só pode ser gerado para alunos com acesso ativo neste curso.")
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", enrollment.user_id)
    .maybeSingle()
  if (profileError || profile?.role !== "student") {
    throw new Error("O link de acesso só pode ser gerado para contas de aluno.")
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(enrollment.user_id)
  const email = userData?.user?.email
  if (userError || !email) {
    throwSafeDatabaseError("admin.access_link.user_failed", userError, "Não foi possível localizar a conta do aluno.")
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "recovery", email: email! })
  const tokenHash = linkData?.properties?.hashed_token
  if (linkError || !tokenHash) {
    throwSafeDatabaseError("admin.access_link.generate_failed", linkError, "Não foi possível gerar o link de acesso. Tente novamente em alguns minutos.")
  }

  const siteUrl = process.env.SITE_URL
  if (!siteUrl) throw new Error("SITE_URL não está configurada.")
  return { link: buildAccessLink(siteUrl, tokenHash!, "recovery") }
}

function refreshAccessPages(courseId: string) {
  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath("/admin/alunos")
  revalidatePath("/admin")
  revalidatePath("/aluno", "layout")
}
