import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Download } from "lucide-react"
import { PageContainer, PageHeading } from "@/components/student/page-container"
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
  return <PageContainer>
    <PageHeading title={`Análise da redação · ${essay.quizTitle}`} description="Leia a devolutiva do professor e veja o que praticar na próxima redação." />
    <Link href="/aluno/relatorio/redacoes" className={buttonVariants({variant:"outline",className:"mb-6"})}>Voltar às redações</Link>
    {report ? <section className="mb-6 rounded-xl border border-primary/40 bg-primary/10 p-5" aria-label="PDF da correção">
      <h2 className="mb-2 text-lg font-semibold">Sua análise está pronta</h2>
      <p className="mb-4 text-sm text-muted-foreground">Baixe o PDF para ler os comentários e as orientações para seus próximos estudos.</p>
      <a href={`/api/student/essay-reports/${essay.id}`} className={buttonVariants()}><Download className="mr-2 size-4" aria-hidden="true" />Baixar PDF da análise</a>
      <EssayReportSeen essayId={essay.id} storagePath={report.storage_path} />
    </section> : <p className="mb-6 text-sm text-muted-foreground">Quando o professor disponibilizar o PDF da análise, você poderá baixá-lo aqui.</p>}
    <EssayResult essay={essay} title={essay.quizTitle} attempt={experience.isEnabled("nota_geral") ? essay.attempt : null} />
  </PageContainer>
}
