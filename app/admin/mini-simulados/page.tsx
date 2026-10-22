import Link from "next/link"
import { BarChart3, ChevronRight, Plus } from "lucide-react"
import { PageHeader, SectionHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { listAdminCourses } from "@/lib/admin/queries"
import { listAdminMiniQuizzes } from "@/lib/admin/mini-quizzes"
import { getCourseSubjects } from "@/lib/mini-quizzes/queries"
import { resolveCourse } from "./course-param"
import { MiniQuizDocxImport } from "@/components/admin/mini-quiz-docx-import"
import { formatDate } from "@/lib/format"
import { audienceLabel } from "@/lib/groups/experience.mjs"

export const dynamic = "force-dynamic"

const STATUS = {
  draft: { label: "Rascunho", variant: "secondary" },
  published: { label: "Publicado", variant: "default" },
  archived: { label: "Arquivado", variant: "outline" },
} as const

export default async function AdminMiniQuizzesPage({ searchParams }: { searchParams: Promise<{ curso?: string }> }) {
  const { curso } = await searchParams
  const courses = await listAdminCourses()
  const course = resolveCourse(courses, curso)
  if (!course) {
    return <PageHeader title="Mini Simulados" description="Cadastre um curso para criar mini simulados." />
  }
  const [subjects, quizzes] = await Promise.all([getCourseSubjects(course.id), listAdminMiniQuizzes(course.id)])
  const orderedSubjects = [...subjects].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const weekly = quizzes
    .filter((quiz) => !quiz.subjectId)
    .sort((a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0) || (a.targetGroups[0] ?? 0) - (b.targetGroups[0] ?? 0))

  return (
    <>
      <PageHeader
        title="Diagnóstico Semanal"
        description="Diagnósticos semanais e mini simulados por disciplina, com correção comentada e relatório por aluno."
        actions={
          <div className="flex flex-wrap gap-2">
            <MiniQuizDocxImport
              courseId={course.id}
              subjects={orderedSubjects.map((subject) => ({ id: subject.id, name: subject.name }))}
              existingTitles={quizzes.flatMap((quiz) => (quiz.subjectId ? [{ subjectId: quiz.subjectId, title: quiz.title }] : []))}
            />
            <Link href={`/admin/mini-simulados/diagnostico?curso=${course.id}`} className={buttonVariants({ variant: "outline" })}>
              <BarChart3 data-icon="inline-start" />
              Diagnóstico dos alunos
            </Link>
            <Link href={`/admin/mini-simulados/novo?curso=${course.id}`} className={buttonVariants()}>
              <Plus data-icon="inline-start" />
              Novo mini simulado
            </Link>
          </div>
        }
      />

      {courses.length > 1 ? (
        <nav aria-label="Curso" className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
          {courses.map((option) => (
            <Link
              key={option.id}
              href={`/admin/mini-simulados?curso=${option.id}`}
              aria-current={option.id === course.id ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                option.id === course.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {option.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-col gap-8">
        {weekly.length > 0 ? (
          <section aria-labelledby="adm-semanais">
            <SectionHeader
              title={<span id="adm-semanais">Diagnóstico Semanal</span>}
              description={`${weekly.filter((quiz) => quiz.status === "published").length} publicados · abra um para fazer a prévia e publicar. Cada grupo vê só o seu, a partir da data de liberação`}
            />
            <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {weekly.map((quiz) => (
                <li key={quiz.id}>
                  <Link href={`/admin/mini-simulados/${quiz.id}?curso=${course.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{quiz.title}</span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {audienceLabel(quiz.targetGroups)}
                      {quiz.releaseDate ? ` · libera em ${formatDate(quiz.releaseDate)}` : ""} · {quiz.questionCount} questões ·{" "}
                      {quiz.attemptCount} {quiz.attemptCount === 1 ? "aluno fez" : "alunos fizeram"}
                    </span>
                  </span>
                  <Badge variant={STATUS[quiz.status].variant}>{STATUS[quiz.status].label}</Badge>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {orderedSubjects.map((subject) => {
          const list = quizzes.filter((quiz) => quiz.subjectId === subject.id)
          return (
            <section key={subject.id} aria-labelledby={`adm-${subject.id}`}>
              <SectionHeader
                title={<span id={`adm-${subject.id}`}>{subject.name}</span>}
                description={`${list.filter((quiz) => quiz.status === "published").length} publicados · ${list.reduce((sum, quiz) => sum + quiz.questionCount, 0)} questões`}
                action={
                  <Link href={`/admin/mini-simulados/novo?curso=${course.id}&disciplina=${subject.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    <Plus data-icon="inline-start" />
                    Adicionar
                  </Link>
                }
              />
              {list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">Nenhum mini simulado nesta disciplina.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {list.map((quiz) => (
                    <li key={quiz.id}>
                      <Link href={`/admin/mini-simulados/${quiz.id}?curso=${course.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{quiz.title}</span>
                          <span className="block text-xs text-muted-foreground tabular-nums">
                            {quiz.questionCount} questões · {quiz.attemptCount} {quiz.attemptCount === 1 ? "tentativa" : "tentativas"}
                          </span>
                        </span>
                        <Badge variant={STATUS[quiz.status].variant}>{STATUS[quiz.status].label}</Badge>
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </>
  )
}
