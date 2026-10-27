import { notFound } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { PageContainer } from "@/components/student/page-container"
import { PageHeader } from "@/components/student/page-header"
import { GoalItemChecklist } from "@/components/student/goal-item-checklist"
import { StatusBadge } from "@/components/status-badge"
import { Progress } from "@/components/ui/progress"
import { SectionHeader } from "@/components/page-header"
import { getGoalItemMaterials, getStudentContext, getStudentCourseSnapshot } from "@/lib/student/queries"
import { studentGoalWindow } from "@/lib/student/snapshot.mjs"
import { formatDateLong } from "@/lib/format"
import { goalAvailabilityLabel } from "@/lib/student/goal-availability"
import { GoalReleaseRefresh } from "@/components/student/goal-release-refresh"

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>
}) {
  const { goalId } = await params
  const context = await getStudentContext()
  if (!context) notFound()
  const snapshot = await getStudentCourseSnapshot(context.currentCourse.id)
  // Metas além da janela de prévia não são abertas nem por link direto.
  const goal = snapshot ? studentGoalWindow(snapshot.goals).visible.find((candidate) => candidate.id === goalId) : undefined
  if (!goal) notFound()
  // Materiais só desta meta (a lista geral de metas vem sem materiais).
  const materialsByItem = await getGoalItemMaterials(goal.items.map((item) => item.id))
  const items = goal.items.map((item) => ({ ...item, materials: materialsByItem.get(item.id) ?? [] }))

  return (
    <PageContainer>
      <PageHeader
        backHref="/aluno/metas"
        backLabel="Minhas Metas"
        title={goal.title}
        action={<StatusBadge status={goal.isReleased ? goal.progressStatus : "locked"} />}
      />
      <GoalReleaseRefresh releaseDate={goal.dueDate} released={goal.lockReason !== "date"} />

      <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" />
            {goalAvailabilityLabel(goal, formatDateLong)}
          </span>
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{goal.completedItems}</span> de{" "}
            <span className="tabular-nums">{goal.totalItems}</span> {goal.totalItems === 1 ? "item" : "itens"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={goal.progress} className="h-2 flex-1" aria-label={`Progresso da meta: ${goal.progress}%`} />
          <span className="w-10 text-right text-sm font-semibold tabular-nums text-foreground">{goal.progress}%</span>
        </div>
        {goal.description ? (
          <p className="border-t border-border pt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{goal.description}</p>
        ) : null}
      </div>

      <section aria-labelledby="itens-meta">
        <SectionHeader title={<span id="itens-meta">Itens da meta</span>} />
        <div className="flex flex-col gap-3 md:gap-4">
          {items.map((item) => (
            <GoalItemChecklist key={item.id} item={item} locked={!goal.isReleased} />
          ))}
        </div>
      </section>
    </PageContainer>
  )
}
