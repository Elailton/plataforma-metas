import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { ErrorReport } from "@/components/mini-quizzes/error-report"
import { buttonVariants } from "@/components/ui/button"
import { getStudentContext } from "@/lib/student/queries"
import { getDiagnosisData, getErrorReport } from "@/lib/mini-quizzes/queries"

export const dynamic = "force-dynamic"

/** Caderno de erros: as questões erradas nos diagnósticos, por disciplina, para revisar. */
export default async function ErrorNotebookPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const [data, errors] = await Promise.all([
    getDiagnosisData(context.currentCourse.id, context.profile.id),
    getErrorReport(context.currentCourse.id, context.profile.id),
  ])

  return (
    <PageContainer>
      <PageHeading
        title="Caderno de erros"
        description="As questões que você errou nos diagnósticos. Disciplinas com mais erros aparecem primeiro; abra o comentário de cada questão."
        actions={
          <Link href="/aluno/relatorio" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft data-icon="inline-start" />
            Relatório
          </Link>
        }
      />
      <ErrorReport items={errors} subjects={data.subjects} />
    </PageContainer>
  )
}
