import { notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { MiniQuizEditor } from "@/components/admin/mini-quiz-editor"
import { getAdminMiniQuiz } from "@/lib/admin/mini-quizzes"
import { getCourseSubjects } from "@/lib/mini-quizzes/queries"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"
import { WeeklyDiagnosticGroups, WeeklyDiagnosticPreview, WeeklyDiagnosticStatusButton } from "@/components/admin/weekly-diagnostic-preview"
import { audienceLabel } from "@/lib/groups/experience.mjs"

export const dynamic = "force-dynamic"

export default async function EditMiniQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const quiz = await getAdminMiniQuiz(quizId)
  if (!quiz) notFound()
  if (!quiz.subjectId) {
    // Diagnóstico Semanal (várias disciplinas): prévia como aluno e publicação. As questões vêm do banco.
    const subjects = await getCourseSubjects(quiz.courseId)
    const names = new Map(subjects.map((subject) => [subject.id, subject.name]))
    const groups = audienceLabel(quiz.targetGroups)
    return (
      <>
        <PageHeader
          title={quiz.title}
          description={`Diagnóstico Semanal · ${groups}${quiz.releaseDate ? ` · libera em ${formatDate(quiz.releaseDate)}` : ""} · ${quiz.questions.length} questões · ${quiz.attemptCount} ${quiz.attemptCount === 1 ? "aluno fez" : "alunos fizeram"}`}
          backHref={`/admin/mini-simulados?curso=${quiz.courseId}`}
          backLabel="Diagnóstico Semanal"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={quiz.status === "published" ? "default" : "secondary"}>{quiz.status === "published" ? "Publicado" : "Rascunho"}</Badge>
              <WeeklyDiagnosticStatusButton quizId={quiz.id} status={quiz.status} />
            </div>
          }
        />
        <div className="mb-5">
          <WeeklyDiagnosticGroups quizId={quiz.id} groups={quiz.targetGroups} />
        </div>
        <WeeklyDiagnosticPreview
          questions={quiz.questions.map((question) => ({
            id: question.id,
            statement: question.statement,
            alternatives: question.alternatives,
            correctKey: question.correctKey,
            explanation: question.explanation,
            subjectName: (question.subjectId && names.get(question.subjectId)) || "Sem disciplina",
          }))}
        />
      </>
    )
  }
  const subjects = [...(await getCourseSubjects(quiz.courseId))].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return (
    <>
      <PageHeader title={quiz.title} description="Editar mini simulado" backHref={`/admin/mini-simulados?curso=${quiz.courseId}`} backLabel="Mini Simulados" />
      <MiniQuizEditor key={quiz.updatedAt} courseId={quiz.courseId} subjects={subjects} quiz={{ ...quiz, subjectId: quiz.subjectId }} />
    </>
  )
}
