import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle2, ChevronRight, PlayCircle } from "lucide-react"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { SimuladosTabs } from "@/components/student/simulados-tabs"
import { SectionHeader } from "@/components/page-header"
import { scoreTone } from "@/components/mini-quizzes/format"
import { cn } from "@/lib/utils"
import { getStudentContext } from "@/lib/student/queries"
import { requireStudentFeature } from "@/lib/student/experience"
import { getStudentQuizOverview, getUpcomingQuizzes } from "@/lib/mini-quizzes/queries"
import { UpcomingQuizzes } from "@/components/mini-quizzes/upcoming-quizzes"
import { WEEKLY_GROUP_ID, groupQuizzesBySubject, pendingQuizWindow } from "@/lib/mini-quizzes/core.mjs"

export const dynamic = "force-dynamic"

export default async function WeeklyDiagnosticsPage() {
  await requireStudentFeature("diagnostico_semanal")
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const [overview, upcoming] = await Promise.all([
    getStudentQuizOverview(context.currentCourse.id, context.profile.id),
    getUpcomingQuizzes(context.currentCourse.id),
  ])
  const groups = groupQuizzesBySubject(overview)
  const openNotDone = groups.find((group) => group.id === WEEKLY_GROUP_ID)?.quizzes.filter((quiz) => quiz.attemptCount === 0).length ?? 0
  const locked = pendingQuizWindow({ openNotDone, upcoming: upcoming.filter((item) => item.kind === "semanal") })

  return (
    <PageContainer>
      <PageHeading
        title="Diagnóstico Semanal"
        description="Um diagnóstico a cada 7 metas, sobre o que você estudou. Ele aparece quando você conclui a última meta do bloco (Meta 07, 14, 21...). Feito uma única vez, com cronômetro e ranking."
      />
      <SimuladosTabs current="/aluno/diagnostico-semanal" />

      {groups.length === 0 && locked.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhum diagnóstico semanal liberado ainda. Conclua a última meta do bloco (Meta 07, 14, 21...) para liberar o próximo.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => {
            const done = group.quizzes.filter((quiz) => quiz.attemptCount > 0).length
            return (
              <section key={group.id} aria-labelledby={`titulo-${group.id}`}>
                <SectionHeader
                  title={<span id={`titulo-${group.id}`}>{group.name}</span>}
                  description={`${done} de ${group.quizzes.length} feitos`}
                />
                <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {group.quizzes.map((quiz) => {
                    const finished = quiz.attemptCount > 0
                    return (
                      <li key={quiz.id}>
                        <Link href={`/aluno/diagnostico-semanal/${quiz.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-lg",
                              finished ? "bg-success/10 text-success" : "bg-primary/10 text-primary",
                            )}
                            aria-hidden="true"
                          >
                            {finished ? <CheckCircle2 className="size-4.5" /> : <PlayCircle className="size-4.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">{quiz.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {quiz.questionCount} {quiz.questionCount === 1 ? "questão" : "questões"}
                              {finished ? " · concluído" : " · disponível"}
                            </span>
                          </span>
                          {quiz.firstScore !== null ? (
                            <span className={cn("shrink-0 text-sm font-semibold tabular-nums", scoreTone(quiz.firstScore))}>{quiz.firstScore}%</span>
                          ) : null}
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          {locked.length > 0 ? (
            <section aria-labelledby="proximos-diagnosticos">
              <SectionHeader
                title={<span id="proximos-diagnosticos">Próximos diagnósticos</span>}
                description="Abrem quando você conclui a última meta do bloco."
              />
              <UpcomingQuizzes items={locked} />
            </section>
          ) : null}
        </div>
      )}
    </PageContainer>
  )
}
