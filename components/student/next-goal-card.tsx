import Link from "next/link"
import { ArrowRight, CalendarDays, Lock, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { StudentGoal } from "@/lib/student/types"
import { formatDate } from "@/lib/format"
import { goalAvailabilityLabel } from "@/lib/student/goal-availability"
import { GoalReleaseRefresh } from "@/components/student/goal-release-refresh"
import { cn } from "@/lib/utils"

export function NextGoalCard({ goal }: { goal: StudentGoal }) {
  const disciplineNames = Array.from(new Set(goal.items.map((item) => item.subjectName)))

  return (
    <div
      aria-disabled={!goal.isReleased}
      className={cn(
        "relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-5 md:p-6",
        goal.isReleased
          ? "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary"
          : "select-none border-border/50 bg-black/30 opacity-75",
      )}
    >
      <GoalReleaseRefresh releaseDate={goal.dueDate} released={goal.lockReason !== "date"} />
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Target className={cn("size-4", goal.isReleased && "text-primary")} aria-hidden="true" />
          Meta {goal.number}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {goalAvailabilityLabel(goal, formatDate, "Disponível")}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-balance text-xl font-semibold leading-snug tracking-tight text-foreground">{goal.title}</h3>
        {disciplineNames.length > 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{disciplineNames.join(" • ")}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {goal.completedItems} de {goal.totalItems} {goal.totalItems === 1 ? "item concluído" : "itens concluídos"}
          </span>
          <span className="font-semibold tabular-nums text-foreground">{goal.progress}%</span>
        </div>
        <Progress value={goal.progress} className="h-2" />
      </div>

      {goal.isReleased ? (
        <Button
          render={<Link href={`/aluno/metas/${goal.id}`} />}
          nativeButton={false}
          size="lg"
          className="h-11 w-full text-sm font-semibold sm:w-fit sm:px-5"
        >
          {goal.progress > 0 ? "Continuar meta" : "Começar meta"}
          <ArrowRight data-icon="inline-end" />
        </Button>
      ) : (
        <Button type="button" size="lg" className="h-11 w-full cursor-not-allowed sm:w-fit sm:px-5" disabled>
          Meta bloqueada
          <Lock data-icon="inline-end" />
        </Button>
      )}
    </div>
  )
}
