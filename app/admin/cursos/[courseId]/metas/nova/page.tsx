import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
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
      <div className="flex items-center gap-3">
        <Button
          render={<Link href={`/admin/cursos/${course.id}`} aria-label="Voltar" />}
          nativeButton={false}
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
        >
          <ArrowLeft />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Criar meta</h1>
          <p className="text-sm text-muted-foreground">{course.name}</p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre ao menos uma disciplina no edital deste curso antes de criar uma meta.
        </p>
      ) : (
        <GoalForm courseId={course.id} subjects={subjects} topicsBySubject={topicsBySubject} materials={materials} />
      )}
    </div>
  )
}
