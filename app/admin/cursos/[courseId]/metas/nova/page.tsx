import { notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { GoalForm } from "@/components/admin/goal-form"
import { getAdminCourse, listCourseEdital, listMaterials } from "@/lib/admin/queries"

export default async function NewGoalPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const course = await getAdminCourse(courseId)
  if (!course) notFound()

  const [edital, materials] = await Promise.all([listCourseEdital(course.id), listMaterials(course.id)])
  const subjects = edital.map((group) => group.subject)
  const topicsBySubject = Object.fromEntries(edital.map((group) => [group.subject.id, group.topics]))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader className="mb-0 md:mb-0" backHref={`/admin/cursos/${course.id}`} backLabel={course.name} title="Criar meta" description="Monte os itens da meta com disciplina, tópico, orientação e materiais." />

      {subjects.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Cadastre ao menos uma disciplina no edital deste curso antes de criar uma meta.
        </p>
      ) : (
        <GoalForm courseId={course.id} subjects={subjects} topicsBySubject={topicsBySubject} materials={materials} />
      )}
    </div>
  )
}
