import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/status-badge"
import { getDiscipline, getGoalProgress, getGoalStatus } from "@/lib/mock-data"
import type { Goal } from "@/lib/types"
import { formatDate } from "@/lib/format"

export function GoalCard({ goal }: { goal: Goal }) {
  const progress = getGoalProgress(goal)
  const status = getGoalStatus(goal)
  const disciplineNames = Array.from(
    new Set(goal.items.map((item) => getDiscipline(item.disciplineId)?.name).filter(Boolean)),
  ) as string[]

  return (
    <Link
      href={`/aluno/metas/${goal.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-secondary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Meta {goal.number}</span>
          <h3 className="text-sm font-semibold leading-snug text-foreground">{goal.title}</h3>
        </div>
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <p className="text-xs text-muted-foreground">{disciplineNames.join(" • ")}</p>

      <div className="flex items-center gap-3">
        <Progress value={progress} className="h-1.5 flex-1" />
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{progress}%</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{formatDate(goal.date)}</span>
        <StatusBadge status={status} />
      </div>
    </Link>
  )
}
