import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoalForm } from "@/components/admin/goal-form"
import { GoalActions } from "@/components/admin/goal-actions"
import { getAdminCourse, getAdminGoal, listCourseEdital, listMaterials } from "@/lib/admin/queries"

export default async function AdminGoalDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; goalId: string }>
}) {
  const { courseId, goalId } = await params
  const course = await getAdminCourse(courseId)
  const goal = await getAdminGoal(goalId)
  if (!course || !goal || goal.courseId !== courseId) notFound()

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
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{goal.title}</h1>
          <p className="text-sm text-muted-foreground">{course.name}</p>
        </div>
      </div>

      <GoalActions goal={goal} />

      <GoalForm
        courseId={course.id}
        subjects={subjects}
        topicsBySubject={topicsBySubject}
        materials={materials}
        goal={goal}
      />
    </div>
  )
}
