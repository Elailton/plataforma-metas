import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { BarChart3 } from "lucide-react"
import { PageContainer } from "@/components/student/page-container"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { buttonVariants } from "@/components/ui/button"
import { AttemptReview } from "@/components/mini-quizzes/attempt-review"
import { RankingCard } from "@/components/mini-quizzes/ranking-card"
import { formatDateTime } from "@/components/mini-quizzes/format"
import { getStudentContext } from "@/lib/student/queries"
import { getAttemptReview, getQuizRanking } from "@/lib/mini-quizzes/queries"
import { getStudentExperience } from "@/lib/student/experience"
import { formatDuration, nextAvailableAt, percentage } from "@/lib/mini-quizzes/core.mjs"

export const dynamic = "force-dynamic"

export default async function MiniQuizAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const review = await getAttemptReview(attemptId)
  if (!review || review.attempt.user_id !== context.profile.id) notFound()

  const { attempt } = review
  const score = percentage(attempt.correct_count, attempt.total_count)
  const next = nextAvailableAt(attempt.submitted_at)
  const rankingOn = (await getStudentExperience()).isEnabled("ranking")
  const ranking = rankingOn ? await getQuizRanking(attempt.quiz_id) : []

  return (
    <PageContainer>
      <PageHeader
        title={review.quizTitle}
        eyebrow={`${review.subjectName} · correção comentada`}
        description={`Enviado em ${formatDateTime(attempt.submitted_at)}${!review.isWeekly && next && next.getTime() > Date.now() ? ` · refazer a partir de ${formatDateTime(next.toISOString())}` : ""}`}
        backHref={`/aluno/diagnostico-semanal/${attempt.quiz_id}`}
        backLabel="Diagnóstico Semanal"
        actions={
          <Link href="/aluno/relatorio" className={buttonVariants({ variant: "outline" })}>
            <BarChart3 data-icon="inline-start" />
            Relatório
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Acertos" value={attempt.correct_count} suffix={`/ ${attempt.total_count}`} tone="success" />
        <StatCard label="Aproveitamento" value={`${score}%`} tone="primary" />
        <StatCard label="Tempo" value={formatDuration(attempt.duration_seconds)} />
        <StatCard label="Em branco" value={attempt.total_count - attempt.answered_count} />
      </div>
      {attempt.is_first_of_month || review.isWeekly ? null : (
        <p className="mb-5 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Esta tentativa fica no histórico, mas não altera o diagnóstico do mês: ele usa a primeira tentativa de cada diagnóstico no mês.
        </p>
      )}
      {rankingOn ? <RankingCard rows={ranking} title="Ranking" className="mb-6" /> : null}
      <AttemptReview questions={review.questions} />
    </PageContainer>
  )
}
