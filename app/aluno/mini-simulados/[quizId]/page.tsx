import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Clock } from "lucide-react"
import { PageContainer } from "@/components/student/page-container"
import { PageHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button"
import { QuizRunner } from "@/components/mini-quizzes/quiz-runner"
import { formatDateTime } from "@/components/mini-quizzes/format"
import { getStudentContext } from "@/lib/student/queries"
import { getStudentQuiz } from "@/lib/mini-quizzes/queries"
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

  return (
    <PageContainer>
      <PageHeader
        title={data.quiz.title}
        eyebrow={data.quiz.subjectName}
        description={
          data.attempts.length > 0
            ? `${data.attempts.length + (available ? 1 : 0)}ª tentativa · ${data.questions.length} questões · sem tempo`
            : `${data.questions.length} questões · sem tempo · a correção aparece depois do envio`
        }
        backHref="/aluno/mini-simulados"
        backLabel="Mini Simulados"
      />
      {available ? (
        data.questions.length > 0 ? (
          <QuizRunner quizId={data.quiz.id} questions={data.questions} />
        ) : (
          <p className="text-sm text-muted-foreground">Este mini simulado ainda não tem questões.</p>
        )
      ) : (
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
      )}
    </PageContainer>
  )
}
