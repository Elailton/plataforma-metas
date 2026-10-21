import { redirect } from "next/navigation"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { SectionHeader } from "@/components/page-header"
import { DiagnosisView } from "@/components/mini-quizzes/diagnosis-view"
import { ErrorReport } from "@/components/mini-quizzes/error-report"
import { getStudentContext } from "@/lib/student/queries"
import { getDiagnosisData, getErrorReport } from "@/lib/mini-quizzes/queries"
import { buildDiagnosis, isValidMonthKey } from "@/lib/mini-quizzes/core.mjs"

export const dynamic = "force-dynamic"

export default async function StudentReportPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const [data, errors] = await Promise.all([
    getDiagnosisData(context.currentCourse.id, context.profile.id),
    getErrorReport(context.currentCourse.id, context.profile.id),
  ])
  const diagnosis = buildDiagnosis({ ...data, month: isValidMonthKey(mes) ? mes : null })

  return (
    <PageContainer>
      <PageHeading
        title="Relatório"
        description="O resultado dos seus diagnósticos semanais e os erros organizados por disciplina e assunto, para revisar."
      />
      <div className="flex flex-col gap-10">
        <section aria-labelledby="seus-erros">
          <SectionHeader
            title={<span id="seus-erros">Seus erros para revisar</span>}
            description="Disciplinas com mais erros aparecem primeiro. Abra o comentário de cada questão."
          />
          <ErrorReport items={errors} subjects={data.subjects} />
        </section>
        <section aria-labelledby="desempenho">
          <SectionHeader title={<span id="desempenho">Desempenho por disciplina e assunto</span>} />
          <DiagnosisView
            diagnosis={diagnosis}
            history={data.attempts}
            monthHref={(month) => `/aluno/relatorio?mes=${month}`}
            attemptHref={(id) => `/aluno/diagnostico-semanal/tentativas/${id}`}
          />
        </section>
      </div>
    </PageContainer>
  )
}
