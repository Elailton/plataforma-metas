import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle2, ChevronRight, FileText, PlayCircle } from "lucide-react"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { SectionHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button"
import { scoreTone } from "@/components/mini-quizzes/format"
import { cn } from "@/lib/utils"
import { getStudentContext } from "@/lib/student/queries"
import { getStudentQuizOverview } from "@/lib/mini-quizzes/queries"
import { groupQuizzesBySubject } from "@/lib/mini-quizzes/core.mjs"

export const dynamic = "force-dynamic"

export default async function WeeklyDiagnosticsPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const overview = await getStudentQuizOverview(context.currentCourse.id, context.profile.id)
  const groups = groupQuizzesBySubject(overview)

  return (
    <PageContainer>
      <PageHeading
        title="Diagnóstico Semanal"
        description="Um diagnóstico a cada 7 metas, sobre o que você estudou. Ele aparece quando você conclui a última meta do bloco (Meta 07, 14, 21...). Feito uma única vez, com cronômetro e ranking."
        actions={
          <Link href="/aluno/relatorio" className={buttonVariants({ variant: "outline" })}>
            <FileText data-icon="inline-start" />
            Relatório
          </Link>
        }
      />

      {groups.length === 0 ? (
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
        </div>
      )}
    </PageContainer>
  )
}
