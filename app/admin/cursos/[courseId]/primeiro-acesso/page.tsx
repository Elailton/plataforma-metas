import { notFound } from "next/navigation"
import { FirstAccessForm } from "@/components/student/first-access-form"
import { requireAdmin } from "@/lib/admin/auth"
import { getAdminCourse } from "@/lib/admin/queries"
import { validateQuestionnaireSchema } from "@/lib/groups/schema.mjs"

// Prévia do primeiro acesso para o administrador: mesmo formulário do aluno, nada é gravado.
export default async function AdminFirstAccessPreviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  await requireAdmin()
  const { courseId } = await params
  const course = await getAdminCourse(courseId)
  if (!course) notFound()
  let schema: ReturnType<typeof validateQuestionnaireSchema> = []
  try {
    schema = validateQuestionnaireSchema(course.questionnaireSchema)
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
