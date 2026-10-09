"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { questionnaireLabels } from "@/lib/groups/schema.mjs"
import { normalizeSubmission } from "@/lib/groups/questionnaire.mjs"

export async function submitFirstAccessQuestionnaire(
  enrollmentId: string,
  answers: Record<string, unknown>,
  whatsapp: string,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Seu link expirou. Solicite um novo convite.")
  const { data: enrollment, error } = await supabase
    .from("enrollments")
    .select(
      "id, questionnaire, courses!enrollments_course_id_fkey(questionnaire_schema, groups_enabled)",
    )
    .eq("id", enrollmentId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()
  if (error || !enrollment) throw new Error("Matrícula não encontrada.")
  if (enrollment.questionnaire) return
  const course = Array.isArray(enrollment.courses)
    ? enrollment.courses[0]
    : enrollment.courses
  if (!course?.groups_enabled) throw new Error("Questionário não disponível.")
  const labels = questionnaireLabels(course.questionnaire_schema, answers)
  const submission = normalizeSubmission({
    id_envio: crypto.randomUUID(),
    email: user.email,
    aluno: user.user_metadata.full_name ?? "",
    whatsapp,
    versao: "course-questionnaire-v1",
    respostas: answers,
    ...labels,
  })
  const { error: saveError } = await supabase.rpc("save_course_questionnaire", {
    requested_enrollment_id: enrollmentId,
    requested_submission_id: submission.submissionId,
    requested_payload: submission.payload,
  })
  if (saveError)
    throw new Error("Não foi possível salvar suas respostas. Tente novamente.")
  revalidatePath("/aluno", "layout")
}
