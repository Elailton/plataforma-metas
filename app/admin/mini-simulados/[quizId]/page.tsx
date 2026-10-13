import { notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { MiniQuizEditor } from "@/components/admin/mini-quiz-editor"
import { getAdminMiniQuiz } from "@/lib/admin/mini-quizzes"
import { getCourseSubjects } from "@/lib/mini-quizzes/queries"

export const dynamic = "force-dynamic"

export default async function EditMiniQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const quiz = await getAdminMiniQuiz(quizId)
  if (!quiz) notFound()
  const subjects = [...(await getCourseSubjects(quiz.courseId))].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return (
    <>
      <PageHeader title={quiz.title} description="Editar mini simulado" backHref={`/admin/mini-simulados?curso=${quiz.courseId}`} backLabel="Mini Simulados" />
      <MiniQuizEditor key={quiz.updatedAt} courseId={quiz.courseId} subjects={subjects} quiz={quiz} />
    </>
  )
}
