import Link from "next/link"
import { redirect } from "next/navigation"
import { FileText, ChevronRight } from "lucide-react"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { getStudentContext } from "@/lib/student/queries"
import { getStudentEssays } from "@/lib/mini-quizzes/essays"
import { getEssayReports } from "@/lib/mini-quizzes/essay-reports"
import { reportHref } from "@/lib/mini-quizzes/essay-report.mjs"
import { essayStatusLabel } from "@/lib/mini-quizzes/essay.mjs"
import { buttonVariants } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function StudentEssaysPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const essays = await getStudentEssays(context.currentCourse.id, context.profile.id)
  const reports = await getEssayReports(essays.map((essay) => essay.id))
  const ready = new Set(reports.map((report) => report.essay_id))
  return <PageContainer>
    <PageHeading title="Redações" description="Acompanhe suas correções e leia as orientações do professor." />
    <Link href="/aluno/relatorio" className={buttonVariants({variant:"outline",className:"mb-6"})}>Voltar ao Relatório</Link>
    {essays.length ? <div className="space-y-3">{essays.map((essay) => <Link key={essay.id} href={reportHref(essay.id)} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50">
      <FileText className="size-6 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1"><span className="block font-semibold">Análise da redação · {essay.quizTitle}</span>
      <span className="block text-sm text-muted-foreground">{essayStatusLabel(essay)}{ready.has(essay.id) ? " · PDF disponível" : ""}</span></span>
      <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
    </Link>)}</div> : <p className="text-muted-foreground">Suas redações aparecerão aqui após o envio nos simulados.</p>}
  </PageContainer>
}
