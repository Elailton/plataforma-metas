import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { DisciplineProgressChart } from "@/components/student/discipline-progress-chart"
import { getStudentContext, getStudentCourseSnapshot } from "@/lib/student/queries"

export default async function ProgressPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const snapshot = await getStudentCourseSnapshot(context.currentCourse.id)
  if (!snapshot) redirect("/auth/sem-acesso")
  const completedGoals = snapshot.goals.filter((goal) => goal.progressStatus === "completed").length
  const inProgressGoals = snapshot.goals.filter((goal) => goal.progressStatus === "in_progress").length

  return (
    <PageContainer>
      <PageHeading title="Progresso" description="Sua evolução geral no curso." />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="gap-1.5 py-3.5">
          <CardHeader className="px-3.5">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Edital</CardTitle>
          </CardHeader>
          <CardContent className="px-3.5">
            <span className="text-xl font-semibold tabular-nums text-foreground">{snapshot.editalPercentage}%</span>
          </CardContent>
        </Card>
        <Card className="gap-1.5 py-3.5">
          <CardHeader className="px-3.5">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Concluídas</CardTitle>
          </CardHeader>
          <CardContent className="px-3.5">
            <span className="text-xl font-semibold tabular-nums text-success">{completedGoals}</span>
          </CardContent>
        </Card>
        <Card className="gap-1.5 py-3.5">
          <CardHeader className="px-3.5">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Em curso</CardTitle>
          </CardHeader>
          <CardContent className="px-3.5">
            <span className="text-xl font-semibold tabular-nums text-primary">{inProgressGoals}</span>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Progresso por disciplina</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          <DisciplineProgressChart subjects={snapshot.subjects} />
        </CardContent>
      </Card>
    </PageContainer>
  )
}
