import { redirect } from "next/navigation"
import { BookOpen, CheckCircle2, ListChecks } from "lucide-react"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { SectionHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { DisciplineProgressChart } from "@/components/student/discipline-progress-chart"
import { getStudentContext, getStudentCourseSnapshot } from "@/lib/student/queries"
import { studentGoalWindow } from "@/lib/student/snapshot.mjs"

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

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatCard
          label="Edital estudado"
          value={`${snapshot.editalPercentage}%`}
          hint={`${snapshot.studiedTopics} de ${snapshot.totalTopics} tópicos`}
          icon={BookOpen}
          tone="primary"
        />
        <StatCard
          label="Metas concluídas"
          value={completedGoals}
          suffix={`/ ${studentGoalWindow(snapshot.goals).releasedCount}`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Em andamento"
          value={inProgressGoals}
          suffix={inProgressGoals === 1 ? "meta" : "metas"}
          icon={ListChecks}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <section aria-labelledby="progresso-por-disciplina">
        <SectionHeader
          title={<span id="progresso-por-disciplina">Progresso por disciplina</span>}
          description="Percentual de tópicos do edital estudados."
        />
        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 md:p-5">
          {snapshot.subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">O edital deste curso ainda não foi cadastrado.</p>
          ) : (
            <DisciplineProgressChart subjects={snapshot.subjects} />
          )}
        </div>
      </section>
    </PageContainer>
  )
}
