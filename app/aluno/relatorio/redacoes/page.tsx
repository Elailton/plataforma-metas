import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, FileText } from "lucide-react"
import { PageContainer } from "@/components/student/page-container"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { getStudentContext } from "@/lib/student/queries"
import { getEssayAnalysisData } from "@/lib/mini-quizzes/essay-reports"
import { reportHref } from "@/lib/mini-quizzes/essay-report.mjs"
import { essayStatusLabel } from "@/lib/mini-quizzes/essay.mjs"

export const dynamic = "force-dynamic"

export default async function StudentEssaysPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const { essays, reports } = await getEssayAnalysisData(context.currentCourse.id, context.profile.id)
  const byEssay = new Map(reports.map((report) => [report.essay_id, report]))
  return (
    <PageContainer>
      <PageHeader
        backHref="/aluno/relatorio"
        backLabel="Relatório"
        title="Redações"
        description="Notas, comentários e a análise em PDF das redações dos simulados."
      />
      {essays.length ? (
        <div className="flex flex-col gap-3">
          {essays.map((essay) => {
            const report = byEssay.get(essay.id)
            return (
              <Link
                key={essay.id}
                href={reportHref(essay.id)}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-primary" aria-hidden="true">
                  <FileText className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-foreground">{essay.quizTitle}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant={essay.status === "graded" ? "default" : essay.status === "annulled" ? "destructive" : "secondary"}>
                      {essayStatusLabel(essay)}
                    </Badge>
                    {report ? <Badge variant="outline">{report.viewed_at ? "PDF da análise" : "PDF novo"}</Badge> : null}
                    {essay.isTestCopy ? <Badge variant="outline">Conferência</Badge> : null}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Suas redações aparecem aqui depois do envio no simulado.
        </p>
      )}
    </PageContainer>
  )
}
