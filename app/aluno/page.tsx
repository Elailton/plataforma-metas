import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageContainer } from "@/components/student/page-container"
import { GoalCard } from "@/components/student/goal-card"
import { NextGoalCard } from "@/components/student/next-goal-card"
import { DisciplineProgressList } from "@/components/student/discipline-progress-list"
import {
  currentStudent,
  getCourse,
  getEditalProgressByCourse,
  getGoalsByCourse,
  getGoalsSummary,
  getNextGoal,
} from "@/lib/mock-data"

export default function StudentHomePage() {
  const course = getCourse(currentStudent.courseId)!
  const edital = getEditalProgressByCourse(currentStudent.courseId)
  const goalsSummary = getGoalsSummary(currentStudent.courseId)
  const nextGoal = getNextGoal(currentStudent.courseId)
  const recentGoals = getGoalsByCourse(currentStudent.courseId).slice(0, 3)

  const firstName = currentStudent.name.split(" ")[0]

  return (
    <PageContainer className="max-w-2xl">
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Olá, {firstName}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{course.shortName}</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card className="gap-2 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Edital concluído</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <span className="text-2xl font-semibold tabular-nums text-foreground">{edital.percentage}%</span>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Metas concluídas</CardTitle>
          </CardHeader>
          <CardContent className="px-4 flex items-center gap-2">
            <span className="text-2xl font-semibold tabular-nums text-foreground">{goalsSummary.completed}</span>
            <span className="text-sm text-muted-foreground">/ {goalsSummary.total}</span>
          </CardContent>
        </Card>
      </div>

      {nextGoal ? (
        <div className="mb-8">
          <NextGoalCard goal={nextGoal} />
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="size-8 text-success" />
            <p className="text-sm font-medium text-foreground">Todas as metas concluídas!</p>
            <p className="text-xs text-muted-foreground">Aguarde novas metas publicadas pelo seu mentor.</p>
          </CardContent>
        </Card>
      )}

      <div className="mb-8 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Progresso por disciplina</h2>
        <DisciplineProgressList courseId={currentStudent.courseId} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Últimas metas</h2>
          <Link href="/aluno/metas" className="text-xs font-medium text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {recentGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
