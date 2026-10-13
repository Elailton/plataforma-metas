import { notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { MiniQuizEditor } from "@/components/admin/mini-quiz-editor"
import { listAdminCourses } from "@/lib/admin/queries"
import { getCourseSubjects } from "@/lib/mini-quizzes/queries"
import { resolveCourse } from "../course-param"

export const dynamic = "force-dynamic"

export default async function NewMiniQuizPage({ searchParams }: { searchParams: Promise<{ curso?: string; disciplina?: string }> }) {
  const { curso, disciplina } = await searchParams
  const course = resolveCourse(await listAdminCourses(), curso)
  if (!course) notFound()
  const subjects = [...(await getCourseSubjects(course.id))].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return (
    <>
      <PageHeader title="Novo mini simulado" description={course.name} backHref={`/admin/mini-simulados?curso=${course.id}`} backLabel="Mini Simulados" />
      <MiniQuizEditor
        courseId={course.id}
        subjects={subjects}
        quiz={null}
        initialSubjectId={subjects.some((subject) => subject.id === disciplina) ? disciplina : null}
      />
    </>
  )
}
