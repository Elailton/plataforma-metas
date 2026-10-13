import Link from "next/link"
import { redirect } from "next/navigation"
import { BarChart3, ChevronRight, Clock, PlayCircle, RotateCcw } from "lucide-react"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { SectionHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button"
import { formatDateTime, scoreTone } from "@/components/mini-quizzes/format"
import { cn } from "@/lib/utils"
import { getStudentContext } from "@/lib/student/queries"
import { getStudentQuizOverview } from "@/lib/mini-quizzes/queries"
import { groupQuizzesBySubject } from "@/lib/mini-quizzes/core.mjs"

export const dynamic = "force-dynamic"

export default async function MiniQuizzesPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const overview = await getStudentQuizOverview(context.currentCourse.id, context.profile.id)
  const groups = groupQuizzesBySubject(overview)

  return (
    <PageContainer>
      <PageHeading
        title="Mini Simulados"
        description="Resolva por disciplina, sem tempo. Depois de enviar, você pode refazer após 7 dias."
        actions={
          <Link href="/aluno/mini-simulados/diagnostico" className={buttonVariants({ variant: "outline" })}>
            <BarChart3 data-icon="inline-start" />
            Meu diagnóstico
          </Link>
        }
      />

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Os mini simulados deste curso ainda não foram liberados.
        </div>
      ) : (
        <>
          <nav aria-label="Disciplinas" className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
            {groups.map((group) => (
              <a
                key={group.id}
                href={`#disciplina-${group.id}`}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {group.name} <span className="tabular-nums">· {group.quizzes.length}</span>
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-8">
            {groups.map((group) => {
              const done = group.quizzes.filter((quiz) => quiz.attemptCount > 0).length
              return (
                <section key={group.id} id={`disciplina-${group.id}`} aria-labelledby={`titulo-${group.id}`} className="scroll-mt-20">
                  <SectionHeader
                    title={<span id={`titulo-${group.id}`}>{group.name}</span>}
                    description={`${done} de ${group.quizzes.length} resolvidos`}
                  />
                  <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {group.quizzes.map((quiz) => {
                      const href =
                        quiz.status === "waiting" && quiz.lastAttemptId
                          ? `/aluno/mini-simulados/tentativas/${quiz.lastAttemptId}`
                          : `/aluno/mini-simulados/${quiz.id}`
                      return (
                        <li key={quiz.id}>
                          <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
                            <span
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                                quiz.status === "new" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                              )}
                              aria-hidden="true"
                            >
                              {quiz.status === "new" ? <PlayCircle className="size-4.5" /> : quiz.status === "retake" ? <RotateCcw className="size-4.5" /> : <Clock className="size-4.5" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">{quiz.title}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {quiz.questionCount} {quiz.questionCount === 1 ? "questão" : "questões"}
                                {quiz.status === "new" ? " · não resolvido" : null}
                                {quiz.status === "retake" ? " · pode refazer" : null}
                                {quiz.status === "waiting" && quiz.nextAvailableAt ? ` · refazer em ${formatDateTime(quiz.nextAvailableAt)}` : null}
                              </span>
                            </span>
                            {quiz.firstScore !== null ? (
                              <span className="shrink-0 text-right">
                                <span className={cn("block text-sm font-semibold tabular-nums", scoreTone(quiz.lastScore ?? 0))}>{quiz.lastScore}%</span>
                                <span className="block text-[11px] text-muted-foreground">
                                  {quiz.attemptCount > 1 ? `1ª: ${quiz.firstScore}%` : "1ª tentativa"}
                                </span>
                              </span>
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
        </>
      )}
    </PageContainer>
  )
}
