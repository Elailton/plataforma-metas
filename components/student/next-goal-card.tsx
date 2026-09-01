import Link from "next/link"
import { ArrowRight, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { getDiscipline, getGoalProgress } from "@/lib/mock-data"
import type { Goal } from "@/lib/types"
import { formatDate } from "@/lib/format"

export function NextGoalCard({ goal }: { goal: Goal }) {
  const progress = getGoalProgress(goal)
  const disciplineNames = Array.from(
    new Set(goal.items.map((item) => getDiscipline(item.disciplineId)?.name).filter(Boolean)),
  ) as string[]

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-primary p-5 text-primary-foreground">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/15">
          <Target className="size-4" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">
          Sua próxima meta
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-primary-foreground/70">
          Meta {goal.number} · {formatDate(goal.date)}
        </span>
        <h3 className="text-lg font-semibold leading-snug text-balance">{goal.title}</h3>
        <p className="text-sm text-primary-foreground/75">{disciplineNames.join(" • ")}</p>
      </div>

      <div className="flex items-center gap-3">
        <Progress value={progress} className="h-1.5 flex-1 bg-primary-foreground/20 [&>div]:bg-accent" />
        <span className="text-xs font-medium tabular-nums text-primary-foreground/80">{progress}%</span>
      </div>

      <Button
        render={<Link href={`/aluno/metas/${goal.id}`} />}
        nativeButton={false}
        variant="secondary"
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        Continuar meta
        <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  )
}
