import { notFound, redirect } from "next/navigation"
import { FirstAccessForm } from "@/components/student/first-access-form"
import { requireAdmin } from "@/lib/admin/auth"
import { getAdminCourse } from "@/lib/admin/queries"
import { validateQuestionnaireSchema, withAvailabilityStandard } from "@/lib/groups/schema.mjs"

export const dynamic = "force-dynamic"

// Prévia do primeiro acesso para o administrador, em tela cheia como o aluno vê.
// Nada é gravado. Fica fora de /admin só para não herdar o menu lateral do painel.
export default async function FirstAccessPreviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  let isAdmin = true
  try {
    await requireAdmin()
  } catch {
    isAdmin = false
  }
  if (!isAdmin) redirect(`/auth/login?next=/previa/primeiro-acesso/${encodeURIComponent(courseId)}`)
  const course = await getAdminCourse(courseId)
  if (!course) notFound()
  let schema: ReturnType<typeof validateQuestionnaireSchema> = []
  try {
    schema = withAvailabilityStandard(validateQuestionnaireSchema(course.questionnaireSchema))
  } catch {
    schema = []
  }
  return (
    <FirstAccessForm
      preview
      questionnaires={
        course.groupsEnabled && schema.length
          ? [{ enrollmentId: `previa-${course.id}`, courseName: course.name, schema }]
          : []
      }
      userId={`previa-${course.id}`}
      email="aluno@exemplo.com"
    />
  )
}
