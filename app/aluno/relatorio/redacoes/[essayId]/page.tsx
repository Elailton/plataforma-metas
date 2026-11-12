import { notFound, redirect } from "next/navigation"
import { Download, FileText } from "lucide-react"
import { PageContainer } from "@/components/student/page-container"
import { PageHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button"
import { EssayResult } from "@/components/mini-quizzes/essay-result"
import { EssayReportSeen } from "@/components/mini-quizzes/essay-report-seen"
import { getStudentContext } from "@/lib/student/queries"
import { getStudentExperience } from "@/lib/student/experience"
import { getEssayAnalysisData } from "@/lib/mini-quizzes/essay-reports"
import { isUuid } from "@/lib/mini-quizzes/core.mjs"

export const dynamic = "force-dynamic"

export default async function EssayAnalysisPage({params}:{params:Promise<{essayId:string}>}) {
  const {essayId} = await params
  if (!isUuid(essayId)) notFound()
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const [data,experience] = await Promise.all([
    getEssayAnalysisData(context.currentCourse.id,context.profile.id),getStudentExperience(),
  ])
  const essay = data.essays.find((item) => item.id === essayId)
  if (!essay) notFound()
  const report = data.reports.find((item) => item.essay_id === essayId)
  return (
    <PageContainer>
      <PageHeader
        backHref="/aluno/relatorio/redacoes"
        backLabel="Redações"
        title={`Redação · ${essay.quizTitle}`}
        description="A nota por critério, o comentário do professor e a análise completa em PDF."
      />
      {report ? (
        <section className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 sm:flex-row sm:items-center" aria-label="PDF da análise">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
            <FileText className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-foreground">Análise completa em PDF</span>
            <span className="block text-sm text-muted-foreground">Seus pontos fortes, cada ajuste com o antes e depois e o que praticar na próxima.</span>
          </span>
          <a href={`/api/student/essay-reports/${essay.id}`} className={buttonVariants({ className: "shrink-0" })}>
            <Download className="size-4" aria-hidden="true" />
            Baixar PDF
          </a>
          <EssayReportSeen essayId={essay.id} storagePath={report.storage_path} />
        </section>
      ) : null}
      <EssayResult essay={essay} attempt={experience.isEnabled("nota_geral") ? essay.attempt : null} />
    </PageContainer>
  )
}
