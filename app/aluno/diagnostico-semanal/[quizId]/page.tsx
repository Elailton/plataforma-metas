import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Clock, FileText, ListChecks } from "lucide-react"
import { PageContainer } from "@/components/student/page-container"
import { PageHeader, SectionHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { buttonVariants } from "@/components/ui/button"
import { QuizRunner } from "@/components/mini-quizzes/quiz-runner"
import { QuizStart } from "@/components/mini-quizzes/quiz-start"
import { RankingCard } from "@/components/mini-quizzes/ranking-card"
import { DiagnosticGuidelines } from "@/components/mini-quizzes/diagnostic-guidelines"
import { barTone, formatDateTime } from "@/components/mini-quizzes/format"
import { getStudentContext } from "@/lib/student/queries"
import { getAttemptSubjectBreakdown, getQuizRanking, getStudentQuiz } from "@/lib/mini-quizzes/queries"
import { canAttempt, formatDuration, nextAvailableAt, percentage } from "@/lib/mini-quizzes/core.mjs"

export const dynamic = "force-dynamic"

export default async function WeeklyDiagnosticPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const data = await getStudentQuiz(quizId, context.profile.id)
  if (!data || data.quiz.courseId !== context.currentCourse.id) notFound()

  const first = data.attempts[0] ?? null
  const last = data.attempts[data.attempts.length - 1] ?? null
  // Diagnóstico semanal: tentativa única. Mini simulado por disciplina: refazer após 7 dias.
  const available = data.quiz.isWeekly ? !last : canAttempt(last?.submitted_at)
  const started = available ? data.openStart : null

  const header = (
    <PageHeader
      title={data.quiz.title}
      eyebrow={data.quiz.subjectName}
      description={`${data.questions.length} questões · com cronômetro${data.quiz.isWeekly ? " · tentativa única" : ""}`}
      backHref="/aluno/diagnostico-semanal"
      backLabel="Diagnóstico Semanal"
    />
  )

  // Em andamento: só a prova (sem ranking nem orientações, para não distrair).
  if (started && data.questions.length > 0) {
    return (
      <PageContainer>
        {header}
        <QuizRunner quizId={data.quiz.id} questions={data.questions} startedAt={started.started_at} />
      </PageContainer>
    )
  }

  const [ranking, breakdown] = await Promise.all([
    getQuizRanking(data.quiz.id),
    first ? getAttemptSubjectBreakdown(first.id, data.quiz.courseId) : Promise.resolve([]),
  ])
  const myRank = ranking.find((row) => row.is_me)

  return (
    <PageContainer>
      {header}
      <div className="flex flex-col gap-8">
        {first ? (
          <section aria-labelledby="meu-diagnostico">
            <SectionHeader
              title={<span id="meu-diagnostico">Seu diagnóstico</span>}
              description={`Enviado em ${formatDateTime(first.submitted_at)}`}
            />
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Acertos" value={first.correct_count} suffix={`/ ${first.total_count}`} tone="success" />
              <StatCard label="Aproveitamento" value={`${percentage(first.correct_count, first.total_count)}%`} tone="primary" />
              <StatCard label="Tempo" value={formatDuration(first.duration_seconds)} />
              <StatCard label="Ranking" value={myRank ? `${myRank.rank}º` : "—"} hint={myRank ? `de ${myRank.participants}` : "Você não está no ranking"} />
            </div>
            {breakdown.length > 0 ? (
              <ul className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:p-5">
                {breakdown.map((subject) => {
                  const pct = percentage(subject.correct, subject.total)
                  return (
                    <li key={subject.id} className="grid grid-cols-[minmax(0,1fr)_96px_48px] items-center gap-3 text-sm">
                      <span className="truncate text-foreground">{subject.name}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <span className={`block h-full rounded-full ${barTone(pct)}`} style={{ width: `${pct}%` }} />
                      </span>
                      <span className="text-right tabular-nums text-muted-foreground">
                        {subject.correct}/{subject.total}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Link href={`/aluno/diagnostico-semanal/tentativas/${first.id}`} className={buttonVariants()}>
                <ListChecks data-icon="inline-start" />
                Ver correção comentada
              </Link>
              <Link href="/aluno/relatorio" className={buttonVariants({ variant: "outline" })}>
                <FileText data-icon="inline-start" />
                Ver relatório de erros
              </Link>
            </div>
          </section>
        ) : null}

        {available ? (
          data.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este diagnóstico ainda não tem questões.</p>
          ) : (
            <QuizStart quizId={data.quiz.id} questionCount={data.questions.length} firstAttempt={data.attempts.length === 0} />
          )
        ) : !data.quiz.isWeekly && last ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <Clock className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Você poderá refazer em {formatDateTime(nextAvailableAt(last.submitted_at)!.toISOString())}.
            </p>
          </div>
        ) : null}

        <RankingCard rows={ranking} title="Ranking" />

        <DiagnosticGuidelines questionCount={data.questions.length} weekly={data.quiz.isWeekly} />
      </div>
    </PageContainer>
  )
}
