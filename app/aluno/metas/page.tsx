import { redirect } from "next/navigation"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { GoalsFilter } from "./goals-filter"
import { getStudentContext, getStudentCourseSnapshot } from "@/lib/student/queries"
import { toGoalSummary } from "@/lib/student/snapshot.mjs"

export default async function StudentGoalsPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const snapshot = await getStudentCourseSnapshot(context.currentCourse.id)
  if (!snapshot) redirect("/auth/sem-acesso")

  return (
    <PageContainer>
      <PageHeading title="Minhas Metas" description="Suas metas em ordem cronológica, com o progresso de cada uma." />
      <GoalsFilter goals={snapshot.goals.map(toGoalSummary)} />
    </PageContainer>
  )
}
