import Link from "next/link"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { DiagnosisView } from "@/components/mini-quizzes/diagnosis-view"
import { cn } from "@/lib/utils"
import { listAdminCourses, listCourseStudents } from "@/lib/admin/queries"
import { getDiagnosisData } from "@/lib/mini-quizzes/queries"
import { buildDiagnosis, isValidMonthKey } from "@/lib/mini-quizzes/core.mjs"
import { isUuid } from "@/lib/materials/pdf.mjs"
import { resolveCourse } from "../course-param"

export const dynamic = "force-dynamic"

export default async function AdminDiagnosisPage({
  searchParams,
}: {
  searchParams: Promise<{ curso?: string; aluno?: string; mes?: string }>
}) {
  const { curso, aluno, mes } = await searchParams
  const course = resolveCourse(await listAdminCourses(), curso)
  if (!course) notFound()
  const students = (await listCourseStudents(course.id)).sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"))
  const student = aluno && isUuid(aluno) ? students.find((candidate) => candidate.userId === aluno) ?? null : null
  const data = student ? await getDiagnosisData(course.id, student.userId) : null
  const base = `/admin/mini-simulados/diagnostico?curso=${course.id}`

  return (
    <>
      <PageHeader
        title="Diagnóstico dos alunos"
        description={`${course.name} · escolha um aluno para ver o desempenho nos mini simulados.`}
        backHref={`/admin/mini-simulados?curso=${course.id}`}
        backLabel="Mini Simulados"
      />
      <form action="/admin/mini-simulados/diagnostico" className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="curso" value={course.id} />
        <label htmlFor="aluno" className="text-sm font-medium">Aluno</label>
        <select
          id="aluno"
          name="aluno"
          defaultValue={student?.userId ?? ""}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30 sm:max-w-md"
        >
          <option value="" disabled>
            Selecione…
          </option>
          {students.map((option) => (
            <option key={option.userId} value={option.userId}>
              {option.fullName}
              {option.enrollmentStatus !== "active" ? " (sem acesso ativo)" : ""}
            </option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          Ver diagnóstico
        </button>
      </form>

      {student && data ? (
        <>
          <h2 className="mb-4 text-lg font-semibold">{student.fullName}</h2>
          <DiagnosisView
            diagnosis={buildDiagnosis({ ...data, month: isValidMonthKey(mes) ? mes : null })}
            history={data.attempts}
            monthHref={(month) => `${base}&aluno=${student.userId}&mes=${month}`}
            attemptHref={(id) => `/admin/mini-simulados/tentativas/${id}`}
          />
        </>
      ) : (
        <p className={cn("rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground")}>
          {students.length === 0 ? "Nenhum aluno matriculado neste curso." : "Selecione um aluno para ver o diagnóstico."}
        </p>
      )}
      {student ? null : (
        <p className="mt-4 text-xs text-muted-foreground">
          O diagnóstico considera a primeira tentativa de cada mini simulado no mês. <Link href={base} className="underline">Atualizar</Link>
        </p>
      )}
    </>
  )
}
