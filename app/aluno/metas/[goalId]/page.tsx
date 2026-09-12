import { notFound } from "next/navigation"
import { PageContainer } from "@/components/student/page-container"
import { PageHeader } from "@/components/student/page-header"
import { GoalItemChecklist } from "@/components/student/goal-item-checklist"
import { StatusBadge } from "@/components/status-badge"
import { Progress } from "@/components/ui/progress"
import { getStudentContext, getStudentCourseSnapshot } from "@/lib/student/queries"
import { formatDateLong } from "@/lib/format"
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
  const goal = snapshot?.goals.find((candidate) => candidate.id === goalId)
  if (!goal) notFound()

  return (
    <PageContainer className="md:max-w-[1000px]">
      <PageHeader
        backHref="/aluno/metas"
        title={goal.title}
        description={goal.dueDate
          ? `${goal.isReleased ? "Liberada em" : "Libera em"} ${formatDateLong(goal.dueDate)}`
          : "Disponível imediatamente"}
        action={<StatusBadge status={goal.isReleased ? goal.progressStatus : "locked"} />}
      />
      <GoalReleaseRefresh releaseDate={goal.dueDate} released={goal.isReleased} />

      {goal.description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{goal.description}</p>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        <Progress value={goal.progress} className="h-1.5 flex-1" />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">{goal.progress}%</span>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">Itens da meta</h3>
        {goal.items.map((item) => (
          <GoalItemChecklist key={item.id} item={item} locked={!goal.isReleased} />
        ))}
      </div>
    </PageContainer>
  )
}
