import Link from "next/link"
import { ChevronRight, Lock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/status-badge"
import type { StudentGoal } from "@/lib/student/types"
import { formatDate } from "@/lib/format"

export function GoalCard({ goal }: { goal: StudentGoal }) {
  const disciplineNames = Array.from(new Set(goal.items.map((item) => item.subjectName)))

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold leading-snug text-foreground">{goal.title}</h3>
        </div>
        {goal.isReleased ? (
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        ) : (
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <p className="text-xs text-muted-foreground">{disciplineNames.join(" • ")}</p>

      <div className="flex items-center gap-3">
        <Progress value={goal.progress} className="h-1.5 flex-1" />
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{goal.progress}%</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {goal.dueDate ? `${goal.isReleased ? "Liberada em" : "Libera em"} ${formatDate(goal.dueDate)}` : "Disponível imediatamente"}
        </span>
        <StatusBadge status={goal.isReleased ? goal.progressStatus : "locked"} />
      </div>
    </>
  )

  if (!goal.isReleased) {
    return (
      <article
        aria-disabled="true"
        className="flex cursor-not-allowed select-none flex-col gap-3 rounded-xl border border-border/40 bg-black/35 p-4 opacity-70 grayscale-[0.25]"
      >
        {content}
      </article>
    )
  }

  return (
    <Link
      href={`/aluno/metas/${goal.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/15 hover:bg-secondary/40"
    >
      {content}
    </Link>
  )
}
