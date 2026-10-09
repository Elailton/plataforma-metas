import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FirstAccessForm } from "@/components/student/first-access-form"
import { validateQuestionnaireSchema } from "@/lib/groups/schema.mjs"

export default async function FirstAccessPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      "id,questionnaire,courses!enrollments_course_id_fkey(name,groups_enabled,questionnaire_schema)",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
  if (error) throw new Error("Não foi possível carregar seu primeiro acesso.")
  const questionnaires = (data ?? []).flatMap((row) => {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses
    if (!course?.groups_enabled || row.questionnaire) return []
    const schema = validateQuestionnaireSchema(course.questionnaire_schema)
    return schema.length
      ? [{ enrollmentId: row.id, courseName: course.name, schema }]
      : []
  })
  return <FirstAccessForm questionnaires={questionnaires} />
}
