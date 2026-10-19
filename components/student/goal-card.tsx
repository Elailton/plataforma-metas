import Link from "next/link"
import { CalendarDays, ChevronRight, Lock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/status-badge"
import type { StudentGoalSummary } from "@/lib/student/types"
import { formatDate } from "@/lib/format"
import { goalAvailabilityLabel } from "@/lib/student/goal-availability"
import { cn } from "@/lib/utils"

export function GoalCard({ goal }: { goal: StudentGoalSummary }) {
  const disciplineNames = goal.subjectNames
  const releaseLabel = goalAvailabilityLabel(goal, formatDate)

  const content = (
    <>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums",
            goal.isReleased ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {goal.isReleased ? goal.number : <Lock className="size-4" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-[15px] font-semibold leading-snug text-foreground">{goal.title}</h3>
          {disciplineNames.length > 0 ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{disciplineNames.join(" • ")}</p>
          ) : null}
        </div>
        {goal.isReleased ? (
          <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Progress value={goal.progress} className="h-1.5 flex-1" />
        <span className="w-9 text-right text-xs font-medium text-muted-foreground tabular-nums">{goal.progress}%</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {releaseLabel}
        </span>
        <StatusBadge status={goal.isReleased ? goal.progressStatus : "locked"} />
      </div>
    </>
  )

  if (!goal.isReleased) {
    return (
      <article
        aria-disabled="true"
        className="flex cursor-not-allowed select-none flex-col gap-4 rounded-xl border border-border/50 bg-black/30 p-4 opacity-75 md:p-5"
      >
        {content}
      </article>
    )
  }

  return (
    <Link
      href={`/aluno/metas/${goal.id}`}
      className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:p-5"
    >
      {content}
    </Link>
  )
}
