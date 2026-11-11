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
import { getStudentExperience, requireStudentFeature } from "@/lib/student/experience"
import { formatDuration, nextAvailableAt, percentage } from "@/lib/mini-quizzes/core.mjs"
import { getAttemptEssay, getQuizEssayPrompt } from "@/lib/mini-quizzes/essays"
import { CombinedScoreCard, EssayResult } from "@/components/mini-quizzes/essay-result"

export const dynamic = "force-dynamic"

export default async function MiniQuizAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const review = await getAttemptReview(attemptId)
  if (!review || review.attempt.user_id !== context.profile.id) notFound()
  const monthly = review.kind === "mensal"
  await requireStudentFeature(monthly ? "simulado_mensal" : "diagnostico_semanal")

  const { attempt } = review
  const score = percentage(attempt.correct_count, attempt.total_count)
  const next = nextAvailableAt(attempt.submitted_at)
  const experience = await getStudentExperience()
  const rankingOn = experience.isEnabled("ranking")
  const showTotal = experience.isEnabled("nota_geral")
  const ranking = rankingOn ? await getQuizRanking(attempt.quiz_id) : []
  const essayPrompt = monthly ? await getQuizEssayPrompt(attempt.quiz_id) : null
  const essay = essayPrompt ? await getAttemptEssay(attempt.id) : null

  return (
    <PageContainer>
      <PageHeader
        title={review.quizTitle}
        eyebrow={`${review.subjectName} · correção comentada`}
        description={`Enviado em ${formatDateTime(attempt.submitted_at)}${!review.isWeekly && next && next.getTime() > Date.now() ? ` · refazer a partir de ${formatDateTime(next.toISOString())}` : ""}`}
        backHref={`/aluno/${monthly ? "simulado-geral" : "diagnostico-semanal"}/${attempt.quiz_id}`}
        backLabel={monthly ? "Simulado Geral" : "Diagnóstico Semanal"}
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
      {essayPrompt ? (
        <section id="redacao" aria-label="Redação" className="mb-6 flex scroll-mt-20 flex-col gap-4">
          {essay ? (
            <EssayResult essay={essay} title="Sua redação" attempt={showTotal ? attempt : null} />
          ) : (
            <>
            {showTotal ? <CombinedScoreCard attempt={attempt} essay={null} /> : null}
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Você não enviou redação neste simulado. A redação só pode ser enviada junto com as respostas, dentro do tempo da prova.
            </p>
            </>
          )}
        </section>
      ) : null}
      {rankingOn ? <RankingCard rows={ranking} title="Ranking" className="mb-6" /> : null}
      <AttemptReview questions={review.questions} />
    </PageContainer>
  )
}
