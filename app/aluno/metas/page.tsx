import { redirect } from "next/navigation"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { GoalsFilter } from "./goals-filter"
import { getStudentContext, getStudentCourseSnapshot } from "@/lib/student/queries"
import { studentGoalWindow, toGoalSummary } from "@/lib/student/snapshot.mjs"

export default async function StudentGoalsPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const snapshot = await getStudentCourseSnapshot(context.currentCourse.id)
  if (!snapshot) redirect("/auth/sem-acesso")
  // Só metas liberadas e a prévia das próximas (janela) chegam ao navegador.
  const view = studentGoalWindow(snapshot.goals)

  return (
    <PageContainer>
      <PageHeading title="Minhas Metas" description="Suas metas mais recentes e uma prévia das próximas." />
      <GoalsFilter
        recent={view.recent.map(toGoalSummary)}
        earlier={view.earlier.map(toGoalSummary)}
        upcoming={view.upcoming.map(toGoalSummary)}
      />
    </PageContainer>
  )
}
