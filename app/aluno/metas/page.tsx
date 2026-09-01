import { redirect } from "next/navigation"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { GoalsFilter } from "./goals-filter"
import { getStudentContext, getStudentCourseSnapshot } from "@/lib/student/queries"

export default async function StudentGoalsPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const snapshot = await getStudentCourseSnapshot(context.currentCourse.id)
  if (!snapshot) redirect("/auth/sem-acesso")

  return (
    <PageContainer>
      <PageHeading title="Minhas Metas" description="Suas metas em ordem cronológica." />
      <GoalsFilter goals={snapshot.goals} />
    </PageContainer>
  )
}
