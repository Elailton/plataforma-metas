import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarDays, CheckCircle2, ChevronRight, Clock, ListChecks, PlayCircle } from "lucide-react"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { SimuladosTabs } from "@/components/student/simulados-tabs"
import { SectionHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button"
import { formatMinutes } from "@/components/mini-quizzes/diagnostic-guidelines"
import { scoreTone } from "@/components/mini-quizzes/format"
import { cn } from "@/lib/utils"
import { getStudentContext } from "@/lib/student/queries"
import { requireStudentFeature } from "@/lib/student/experience"
import { getStudentQuizOverview } from "@/lib/mini-quizzes/queries"
import { groupQuizzesBySubject } from "@/lib/mini-quizzes/core.mjs"

export const dynamic = "force-dynamic"

/** Simulado Mensal: simulado geral, com todas as disciplinas do edital no formato da prova. */
export default async function MonthlySimuladoPage() {
  await requireStudentFeature("simulado_mensal")
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const overview = await getStudentQuizOverview(context.currentCourse.id, context.profile.id, "mensal")
  const limits = new Map(overview.quizzes.map((quiz) => [quiz.id, (quiz.time_limit_minutes as number | null) ?? null]))
  // Mais recente primeiro.
  const quizzes = groupQuizzesBySubject(overview).flatMap((group) => group.quizzes).reverse()
  const current = quizzes.find((quiz) => quiz.attemptCount === 0) ?? null
  const others = quizzes.filter((quiz) => quiz !== current)

  return (
    <PageContainer>
      <PageHeading
        title="Simulado Mensal"
        description="Um simulado geral a cada 30 metas, com todas as disciplinas no formato da prova. Ele aparece quando você conclui a Meta 30, 60, 90... Feito uma única vez, com cronômetro e ranking."
      />
      <SimuladosTabs current="/aluno/simulado-mensal" />

      <div className="flex flex-col gap-8">
        {current ? (
          <section aria-labelledby="simulado-do-mes" className="flex flex-col gap-4 rounded-xl border border-primary/40 bg-card p-4 md:p-6">
            <div>
              <p id="simulado-do-mes" className="text-xs font-semibold uppercase tracking-wide text-primary">
                Simulado liberado
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">{current.title}</h2>
              {current.description ? <p className="mt-1 text-sm text-muted-foreground">{current.description}</p> : null}
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ListChecks className="size-3.5" aria-hidden="true" />
                  Questões
                </dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{current.questionCount}</dd>
              </div>
              {limits.get(current.id) ? (
                <div className="rounded-lg bg-muted/50 p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden="true" />
                    Tempo de prova
                  </dt>
                  <dd className="mt-0.5 text-base font-semibold text-foreground">{formatMinutes(limits.get(current.id)!)}</dd>
                </div>
              ) : null}
              <div className="rounded-lg bg-muted/50 p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  Tentativas
                </dt>
                <dd className="mt-0.5 text-base font-semibold text-foreground">Única</dd>
              </div>
            </dl>
            <div>
              <Link href={`/aluno/simulado-mensal/${current.id}`} className={buttonVariants()}>
                <PlayCircle data-icon="inline-start" />
                Abrir simulado
              </Link>
            </div>
          </section>
        ) : quizzes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Nenhum simulado mensal liberado ainda. Conclua a Meta 30 (depois a 60, 90...) para liberar o próximo.
          </div>
        ) : null}

        {others.length > 0 ? (
          <section aria-labelledby="meses-anteriores">
            <SectionHeader title={<span id="meses-anteriores">{current ? "Meses anteriores" : "Simulados feitos"}</span>} />
            <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {others.map((quiz) => {
                const finished = quiz.attemptCount > 0
                return (
                  <li key={quiz.id}>
                    <Link href={`/aluno/simulado-mensal/${quiz.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
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
        ) : null}
      </div>
    </PageContainer>
  )
}
