import { redirect } from "next/navigation"
import { PageContainer } from "@/components/student/page-container"
import { PageHeader } from "@/components/page-header"
import { DiagnosisView } from "@/components/mini-quizzes/diagnosis-view"
import { getStudentContext } from "@/lib/student/queries"
import { getDiagnosisData } from "@/lib/mini-quizzes/queries"
import { buildDiagnosis, isValidMonthKey } from "@/lib/mini-quizzes/core.mjs"

export const dynamic = "force-dynamic"

export default async function StudentDiagnosisPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const data = await getDiagnosisData(context.currentCourse.id, context.profile.id)
  const diagnosis = buildDiagnosis({ ...data, month: isValidMonthKey(mes) ? mes : null })

  return (
    <PageContainer>
      <PageHeader
        title="Meu diagnóstico"
        description="Seu desempenho nos mini simulados, por disciplina e assunto, mês a mês."
        backHref="/aluno/mini-simulados"
        backLabel="Mini Simulados"
      />
      <DiagnosisView
        diagnosis={diagnosis}
        history={data.attempts}
        monthHref={(month) => `/aluno/mini-simulados/diagnostico?mes=${month}`}
        attemptHref={(id) => `/aluno/mini-simulados/tentativas/${id}`}
      />
    </PageContainer>
  )
}
