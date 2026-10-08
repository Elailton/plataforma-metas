"use client"

import { useMemo, useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { GoalCard } from "@/components/student/goal-card"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { ListChecks } from "lucide-react"
import type { StudentGoal } from "@/lib/student/types"
import { GoalReleaseRefresh } from "@/components/student/goal-release-refresh"

type Filter = "all" | "in_progress" | "completed"

export function GoalsFilter({ goals }: { goals: StudentGoal[] }) {
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = useMemo(() => {
    if (filter === "all") return goals
    return goals.filter((goal) => goal.progressStatus === filter)
  }, [goals, filter])

  return (
    <div className="flex flex-col gap-5">
      {goals.filter((goal) => !goal.isReleased).map((goal) => (
        <GoalReleaseRefresh key={goal.id} releaseDate={goal.dueDate} released={goal.isReleased} />
      ))}
      <ToggleGroup
        value={[filter]}
        onValueChange={(value) => value[0] && setFilter(value[0] as Filter)}
        variant="outline"
        className="w-full sm:w-fit"
        aria-label="Filtrar metas"
      >
        <ToggleGroupItem value="all" className="h-9 flex-1 px-4 text-xs sm:flex-none">
          Todas <span className="ml-1 tabular-nums text-muted-foreground">{goals.length}</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="in_progress" className="h-9 flex-1 px-4 text-xs sm:flex-none">
          Em andamento
        </ToggleGroupItem>
        <ToggleGroupItem value="completed" className="h-9 flex-1 px-4 text-xs sm:flex-none">
          Concluídas
        </ToggleGroupItem>
      </ToggleGroup>

      {filtered.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks />
            </EmptyMedia>
            <EmptyTitle>Nenhuma meta encontrada</EmptyTitle>
            <EmptyDescription>Não há metas com este status no momento.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  )
}
