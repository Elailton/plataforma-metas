import { notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
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
      <PageHeader className="mb-0 md:mb-0" backHref={`/admin/cursos/${course.id}`} backLabel={course.name} title={goal.title} />

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
