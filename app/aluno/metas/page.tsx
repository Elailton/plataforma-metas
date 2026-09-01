import { PageContainer, PageHeading } from "@/components/student/page-container"
import { GoalsFilter } from "./goals-filter"
import { currentStudent, getGoalsByCourse } from "@/lib/mock-data"

export default function StudentGoalsPage() {
  const goals = getGoalsByCourse(currentStudent.courseId)

  return (
    <PageContainer>
      <PageHeading title="Minhas Metas" description="Suas metas em ordem cronológica." />
      <GoalsFilter goals={goals} />
    </PageContainer>
  )
}
