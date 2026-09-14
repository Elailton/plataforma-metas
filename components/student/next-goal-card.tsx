import Link from "next/link"
import { ArrowRight, Lock, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { StudentGoal } from "@/lib/student/types"
import { formatDate } from "@/lib/format"
import { GoalReleaseRefresh } from "@/components/student/goal-release-refresh"
import { cn } from "@/lib/utils"

export function NextGoalCard({ goal }: { goal: StudentGoal }) {
  const disciplineNames = Array.from(new Set(goal.items.map((item) => item.subjectName)))

  return (
    <div
      aria-disabled={!goal.isReleased}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-5",
        !goal.isReleased && "select-none border-border/40 bg-black/35 opacity-70 grayscale-[0.25]",
      )}
    >
      <GoalReleaseRefresh releaseDate={goal.dueDate} released={goal.isReleased} />
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-foreground">
          <Target className="size-4" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sua próxima meta
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {goal.dueDate ? `${goal.isReleased ? "Liberada em" : "Libera em"} ${formatDate(goal.dueDate)}` : "Disponível imediatamente"}
        </span>
        <h3 className="text-lg font-semibold leading-snug text-balance text-foreground">{goal.title}</h3>
        <p className="text-sm text-muted-foreground">{disciplineNames.join(" • ")}</p>
      </div>

      <div className="flex items-center gap-3">
        <Progress value={goal.progress} className="h-1.5 flex-1" />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">{goal.progress}%</span>
      </div>

      {goal.isReleased ? (
        <Button render={<Link href={`/aluno/metas/${goal.id}`} />} nativeButton={false} className="w-full">
          Continuar meta
          <ArrowRight data-icon="inline-end" />
        </Button>
      ) : (
        <Button type="button" className="w-full cursor-not-allowed" disabled>
          Meta bloqueada
          <Lock data-icon="inline-end" />
        </Button>
      )}
    </div>
  )
}
