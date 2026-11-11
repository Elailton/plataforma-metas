import Link from "next/link"
import { redirect } from "next/navigation"
import { BookMarked, ChevronRight } from "lucide-react"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { SimuladosTabs } from "@/components/student/simulados-tabs"
import { SectionHeader } from "@/components/page-header"
import { DiagnosisView } from "@/components/mini-quizzes/diagnosis-view"
import { getStudentContext } from "@/lib/student/queries"
import { getDiagnosisData, getErrorReport } from "@/lib/mini-quizzes/queries"
import { buildDiagnosis, isValidMonthKey } from "@/lib/mini-quizzes/core.mjs"
import { getStudentEssays } from "@/lib/mini-quizzes/essays"
import { EssayResult } from "@/components/mini-quizzes/essay-result"
import { getStudentExperience } from "@/lib/student/experience"

export const dynamic = "force-dynamic"

export default async function StudentReportPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const [data, errors, essays, experience] = await Promise.all([
    getDiagnosisData(context.currentCourse.id, context.profile.id),
    getErrorReport(context.currentCourse.id, context.profile.id),
    getStudentEssays(context.currentCourse.id, context.profile.id),
    getStudentExperience(),
  ])
  const showTotal = experience.isEnabled("nota_geral")
  const diagnosis = buildDiagnosis({ ...data, month: isValidMonthKey(mes) ? mes : null })
  const errorCount = errors.length

  return (
    <PageContainer>
      <PageHeading
        title="Relatório"
        description="O resultado dos seus diagnósticos semanais por disciplina e assunto."
      />
      <SimuladosTabs current="/aluno/relatorio" />

      <Link
        href="/aluno/relatorio/caderno-de-erros"
        className="mb-8 flex items-center gap-4 rounded-xl border border-primary/40 bg-primary/10 p-4 transition-colors hover:bg-primary/15"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
          <BookMarked className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-foreground">Caderno de erros</span>
          <span className="block text-sm text-muted-foreground">
            {errorCount === 0
              ? "Nenhum erro para revisar ainda."
              : `${errorCount} ${errorCount === 1 ? "questão errada" : "questões erradas"} para revisar, com o comentário de cada uma.`}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>

      {essays.length > 0 ? (
        <section aria-labelledby="redacoes" className="mb-8">
          <SectionHeader
            title={<span id="redacoes">Redação</span>}
            description="Resultado das redações dos simulados gerais (4 critérios de até 10 pontos; mínimo de 12 na prova)."
          />
          <div className="flex flex-col gap-3">
            {essays.map((essay) => (
              <EssayResult key={essay.id} essay={essay} title={essay.quizTitle} attempt={showTotal ? essay.attempt : null} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="desempenho">
        <SectionHeader title={<span id="desempenho">Desempenho por disciplina e assunto</span>} />
        <DiagnosisView
          diagnosis={diagnosis}
          history={data.attempts}
          monthHref={(month) => `/aluno/relatorio?mes=${month}`}
          attemptHref={(id) => `/aluno/diagnostico-semanal/tentativas/${id}`}
        />
      </section>
    </PageContainer>
  )
}
