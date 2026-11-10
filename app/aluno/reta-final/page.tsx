import { redirect } from "next/navigation"
import { Flag } from "lucide-react"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { GoalsFilter } from "../metas/goals-filter"
import { getStudentContext, getStudentCourseSnapshot } from "@/lib/student/queries"
import { studentGoalWindow, toGoalSummary } from "@/lib/student/snapshot.mjs"

export default async function RetaFinalPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const snapshot = await getStudentCourseSnapshot(context.currentCourse.id, "reta_final")
  if (!snapshot) redirect("/auth/sem-acesso")
  const view = studentGoalWindow(snapshot.goals)

  return (
    <PageContainer>
      <PageHeading title="Reta final" description="Metas especiais para os últimos 45 dias antes da prova." />
      <div className="mb-6 flex items-start gap-3 rounded-xl border-2 border-primary bg-primary/10 p-4 text-sm leading-relaxed text-foreground">
        <Flag className="mt-0.5 size-4.5 shrink-0 text-primary" aria-hidden="true" />
        <p>
          Esta é a reta final: revisão do que mais cai, questões da banca e simulados. Siga uma meta por dia, junto com as suas
          metas de sempre.
        </p>
      </div>
      <GoalsFilter
        recent={view.recent.map(toGoalSummary)}
        earlier={view.earlier.map(toGoalSummary)}
        upcoming={view.upcoming.map(toGoalSummary)}
      />
    </PageContainer>
  )
}
