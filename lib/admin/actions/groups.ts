"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import { validateQuestionnaireSchema } from "@/lib/groups/schema.mjs"
import { normalizeSubmission } from "@/lib/groups/questionnaire.mjs"
import { throwSafeDatabaseError } from "@/lib/security/safe-error"

function refresh(courseId: string) {
  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath("/aluno", "layout")
}
export async function setCourseGroups(
  courseId: string,
  enabled: boolean,
  schema: unknown[],
) {
  const { supabase } = await requireAdmin()
  if (
    typeof enabled !== "boolean" ||
    !Array.isArray(schema) ||
    JSON.stringify(schema).length > 40000
  )
    throw new Error("Configuração inválida.")
  const { error } = await supabase.rpc("admin_set_course_groups", {
    requested_course_id: courseId,
    requested_enabled: enabled,
    requested_schema: validateQuestionnaireSchema(schema),
  })
  if (error)
    throwSafeDatabaseError(
      "admin.groups.configure",
      error,
      "Não foi possível configurar os grupos.",
    )
  refresh(courseId)
}
export async function setStudentGroup(
  enrollmentId: string,
  courseId: string,
  group: number | null,
) {
  const { supabase } = await requireAdmin()
  if (group !== null && group !== 1 && group !== 2)
    throw new Error("Grupo inválido.")
  const { error } = await supabase.rpc("admin_set_enrollment_group", {
    requested_enrollment_id: enrollmentId,
    requested_course_id: courseId,
    requested_group: group,
  })
  if (error)
    throwSafeDatabaseError(
      "admin.groups.assign",
      error,
      "Não foi possível alterar o grupo.",
    )
  refresh(courseId)
}
export async function importQuestionnaire(courseId: string, text: string) {
  const { supabase } = await requireAdmin()
  if (text.length > 60000) throw new Error("Importe uma resposta por vez.")
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error("Cole uma resposta JSON válida.")
  }
  const submission = normalizeSubmission(raw)
  const { data: userId, error: lookupError } = await supabase.rpc(
    "admin_find_student_by_email",
    { requested_email: submission.email },
  )
  if (lookupError || typeof userId !== "string")
    throw new Error(
      "Aluno não encontrado. Matricule uma conta de aluno com este e-mail antes de importar.",
    )
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single()
  if (enrollmentError || !enrollment)
    throw new Error("Este aluno não está matriculado neste curso.")
  const { data: group, error } = await supabase.rpc(
    "save_course_questionnaire",
    {
      requested_enrollment_id: enrollment.id,
      requested_submission_id: submission.submissionId,
      requested_payload: submission.payload,
    },
  )
  if (error)
    throwSafeDatabaseError(
      "admin.groups.import",
      error,
      "Não foi possível importar as respostas.",
    )
  refresh(courseId)
  return group === null
    ? "Respostas salvas. Aluno permanece sem grupo por decisão administrativa."
    : `Respostas salvas. Aluno no Grupo ${group}.`
}
