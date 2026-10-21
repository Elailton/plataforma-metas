import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Clock } from "lucide-react"
import { PageContainer } from "@/components/student/page-container"
import { PageHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button"
import { QuizRunner } from "@/components/mini-quizzes/quiz-runner"
import { QuizStart } from "@/components/mini-quizzes/quiz-start"
import { RankingCard } from "@/components/mini-quizzes/ranking-card"
import { formatDateTime } from "@/components/mini-quizzes/format"
import { getStudentContext } from "@/lib/student/queries"
import { getQuizRanking, getStudentQuiz } from "@/lib/mini-quizzes/queries"
import { canAttempt, nextAvailableAt } from "@/lib/mini-quizzes/core.mjs"

export const dynamic = "force-dynamic"

export default async function MiniQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const data = await getStudentQuiz(quizId, context.profile.id)
  if (!data || data.quiz.courseId !== context.currentCourse.id) notFound()

  const last = data.attempts[data.attempts.length - 1] ?? null
  const available = canAttempt(last?.submitted_at)
  const started = available ? data.openStart : null
  const ranking = started ? [] : await getQuizRanking(data.quiz.id)

  return (
    <PageContainer>
      <PageHeader
        title={data.quiz.title}
        eyebrow={data.quiz.subjectName}
        description={
          data.attempts.length > 0
            ? `${data.attempts.length + (available ? 1 : 0)}ª tentativa · ${data.questions.length} questões · com cronômetro`
            : `${data.questions.length} questões · com cronômetro · a correção aparece depois do envio`
        }
        backHref="/aluno/mini-simulados"
        backLabel="Simulados semanais"
      />
      {available ? (
        data.questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este simulado ainda não tem questões.</p>
        ) : started ? (
          <QuizRunner quizId={data.quiz.id} questions={data.questions} startedAt={started.started_at} />
        ) : (
          <div className="flex flex-col gap-5">
            <QuizStart quizId={data.quiz.id} questionCount={data.questions.length} firstAttempt={data.attempts.length === 0} />
            <RankingCard rows={ranking} title="Ranking deste simulado" />
          </div>
        )
      ) : (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <Clock className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Você poderá refazer em {formatDateTime(nextAvailableAt(last!.submitted_at)!.toISOString())}.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Enquanto isso, revise a correção comentada da última tentativa.</p>
            <Link href={`/aluno/mini-simulados/tentativas/${last!.id}`} className={`${buttonVariants({ variant: "outline" })} mt-4`}>
              Ver correção
            </Link>
          </div>
          <RankingCard rows={ranking} title="Ranking deste simulado" />
        </div>
      )}
    </PageContainer>
  )
}
