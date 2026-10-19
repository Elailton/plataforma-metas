import { InstallApp } from "@/components/student/install-app"
import { studySummary } from "@/lib/groups/questionnaire.mjs"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, BookOpen, CalendarClock, CheckCircle2, ListChecks } from "lucide-react"
import { PageContainer } from "@/components/student/page-container"
import { PageHeader, SectionHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { GoalCard } from "@/components/student/goal-card"
import { studentGoalWindow, toGoalSummary } from "@/lib/student/snapshot.mjs"
import { NextGoalCard } from "@/components/student/next-goal-card"
import { DisciplineProgressList } from "@/components/student/discipline-progress-list"
import {
  getStudentContext,
  getStudentCourseSnapshot,
} from "@/lib/student/queries"

export default async function StudentHomePage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const snapshot = await getStudentCourseSnapshot(context.currentCourse.id)
  if (!snapshot) redirect("/auth/sem-acesso")
  // Disciplinas sem tópicos no edital (ex.: áreas só de materiais) não entram no progresso.
  const progressSubjects = snapshot.subjects.filter((subject) => subject.total > 0)

  const enrollment = context.profile.enrollments.find(
    (e) => e.courseId === context.currentCourse.id,
  )
  const withoutGroup =
    enrollment?.course?.groups_enabled && enrollment.studyGroup == null
  const summary = studySummary(enrollment?.questionnaire)

  const completedGoals = snapshot.goals.filter((goal) => goal.progressStatus === "completed").length
  const inProgressGoals = snapshot.goals.filter((goal) => goal.progressStatus === "in_progress").length
  const nextGoal =
    snapshot.goals.find(
      (goal) => goal.isReleased && goal.progressStatus === "in_progress",
    ) ??
    snapshot.goals.find(
      (goal) => goal.isReleased && goal.progressStatus === "pending",
    ) ??
    // Meta com data futura nunca aparece para o aluno; só as que esperam a anterior.
    snapshot.goals.find((goal) => !goal.isReleased && goal.isDateReleased)
  // O aluno não vê o cronograma inteiro: últimas liberadas ou, antes disso, só a próxima.
  const goalWindow = studentGoalWindow(snapshot.goals)
  const recentGoals =
    goalWindow.recent.length > 0 ? goalWindow.recent.slice(0, 3) : goalWindow.next ? [goalWindow.next] : []
  const firstName = context.profile.fullName.split(" ")[0]
  const hasGoals = snapshot.goals.length > 0

  return (
    <PageContainer size="wide">
      <PageHeader
        eyebrow={`Olá, ${firstName}`}
        title={snapshot.course.name}
        description={summary.length > 0 ? summary.join(" · ") : "Seu plano de estudos e o progresso no edital."}
      />

      <InstallApp />

      <div className="mb-8 grid grid-cols-2 gap-3 md:mb-10 md:grid-cols-3 md:gap-4">
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
          suffix={`/ ${goalWindow.releasedCount}`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Em andamento"
          value={inProgressGoals}
          suffix={inProgressGoals === 1 ? "meta" : "metas"}
          icon={ListChecks}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="proxima-meta">
            <SectionHeader title={<span id="proxima-meta">Próxima meta</span>} />
            {withoutGroup ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <CalendarClock className="size-8 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Aguardando definição do seu plano de estudos</p>
                <p className="text-sm text-muted-foreground">Você está sem grupo. Seu mentor precisa definir seu grupo para liberar as metas.</p>
              </div>
            ) : nextGoal ? (
              <NextGoalCard goal={nextGoal} />
            ) : hasGoals ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-10 text-center">
                <CheckCircle2 className="size-8 text-success" />
                <p className="text-sm font-semibold text-foreground">Todas as metas concluídas!</p>
                <p className="text-sm text-muted-foreground">Aguarde novas metas publicadas pelo seu mentor.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <CalendarClock className="size-8 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Nenhuma meta publicada ainda</p>
                <p className="text-sm text-muted-foreground">Suas metas aparecerão aqui assim que forem publicadas pelo seu mentor.</p>
              </div>
            )}
          </section>

          <section aria-labelledby="ultimas-metas">
            <SectionHeader
              title={<span id="ultimas-metas">Últimas metas</span>}
              action={
                hasGoals ? (
                  <Link
                    href="/aluno/metas"
                    className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Ver todas
                    <ArrowRight className="size-3.5" />
                  </Link>
                ) : null
              }
            />
            {recentGoals.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Nenhuma meta publicada para este curso ainda.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={toGoalSummary(goal)} />
                ))}
              </div>
            )}
          </section>
        </div>

        <section aria-labelledby="progresso-disciplinas" className="min-w-0">
          <SectionHeader
            title={<span id="progresso-disciplinas">Progresso por disciplina</span>}
            action={
              <Link
                href="/aluno/edital"
                className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Edital
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <div className="rounded-xl border border-border bg-card p-4 md:p-5">
            {progressSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">O edital deste curso ainda não foi cadastrado.</p>
            ) : (
              <DisciplineProgressList subjects={progressSubjects} />
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
