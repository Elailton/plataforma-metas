import { notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { AttemptReview } from "@/components/mini-quizzes/attempt-review"
import { formatDateTime } from "@/components/mini-quizzes/format"
import { getAttemptReview } from "@/lib/mini-quizzes/queries"
import { percentage } from "@/lib/mini-quizzes/core.mjs"

export const dynamic = "force-dynamic"

export default async function AdminAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params
  const review = await getAttemptReview(attemptId)
  if (!review) notFound()
  const { attempt } = review
  return (
    <>
      <PageHeader
        title={review.quizTitle}
        eyebrow={`${review.subjectName} · ${attempt.attempt_number}ª tentativa`}
        description={`Enviado em ${formatDateTime(attempt.submitted_at)}`}
        backHref={`/admin/mini-simulados/diagnostico?curso=${attempt.course_id}&aluno=${attempt.user_id}`}
        backLabel="Diagnóstico"
      />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Acertos" value={attempt.correct_count} suffix={`/ ${attempt.total_count}`} tone="success" />
        <StatCard label="Aproveitamento" value={`${percentage(attempt.correct_count, attempt.total_count)}%`} tone="primary" />
        <StatCard label="Em branco" value={attempt.total_count - attempt.answered_count} />
      </div>
      <AttemptReview questions={review.questions} />
    </>
  )
}
