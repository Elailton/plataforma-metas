"use client"

import { useMemo, useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { GoalCard } from "@/components/student/goal-card"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { ListChecks } from "lucide-react"
import { getGoalStatus } from "@/lib/mock-data"
import type { Goal } from "@/lib/types"

type Filter = "all" | "in_progress" | "completed"

export function GoalsFilter({ goals }: { goals: Goal[] }) {
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = useMemo(() => {
    if (filter === "all") return goals
    return goals.filter((goal) => getGoalStatus(goal) === filter)
  }, [goals, filter])

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        value={[filter]}
        onValueChange={(value) => value[0] && setFilter(value[0] as Filter)}
        variant="outline"
        className="w-full"
      >
        <ToggleGroupItem value="all" className="flex-1 text-xs">
          Todas
        </ToggleGroupItem>
        <ToggleGroupItem value="in_progress" className="flex-1 text-xs">
          Em andamento
        </ToggleGroupItem>
        <ToggleGroupItem value="completed" className="flex-1 text-xs">
          Concluídas
        </ToggleGroupItem>
      </ToggleGroup>

      {filtered.length === 0 ? (
        <Empty>
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
