import { notFound } from "next/navigation"
import { PageContainer } from "@/components/student/page-container"
import { PageHeader } from "@/components/student/page-header"
import { GoalItemChecklist } from "@/components/student/goal-item-checklist"
import { StatusBadge } from "@/components/status-badge"
import { Progress } from "@/components/ui/progress"
import { getGoal, getGoalProgress, getGoalStatus } from "@/lib/mock-data"
import { formatDateLong } from "@/lib/format"

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>
}) {
  const { goalId } = await params
  const goal = getGoal(goalId)
  if (!goal) notFound()

  const progress = getGoalProgress(goal)
  const status = getGoalStatus(goal)

  return (
    <PageContainer>
      <PageHeader
        backHref="/aluno/metas"
        title={`Meta ${goal.number}`}
        description={formatDateLong(goal.date)}
      />

      <div className="mt-5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug text-balance text-foreground">{goal.title}</h2>
          <StatusBadge status={status} className="mt-0.5 shrink-0" />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{goal.description}</p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Progress value={progress} className="h-1.5 flex-1" />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">{progress}%</span>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">Itens da meta</h3>
        {goal.items.map((item) => (
          <GoalItemChecklist key={item.id} item={item} />
        ))}
      </div>
    </PageContainer>
  )
}
