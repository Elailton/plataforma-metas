"use client"

import { useMemo, useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { GoalCard } from "@/components/student/goal-card"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { ListChecks } from "lucide-react"
import type { StudentGoalSummary } from "@/lib/student/types"
import { GoalReleaseRefresh } from "@/components/student/goal-release-refresh"

type Filter = "all" | "in_progress" | "completed"

export function GoalsFilter({
  recent,
  earlier,
  upcoming,
}: {
  recent: StudentGoalSummary[]
  earlier: StudentGoalSummary[]
  /** Metas bloqueadas dentro da janela de prévia, em ordem. */
  upcoming: StudentGoalSummary[]
}) {
  const [filter, setFilter] = useState<Filter>("all")
  const [showEarlier, setShowEarlier] = useState(false)
  const released = useMemo(() => [...recent, ...earlier], [recent, earlier])
  const next = upcoming[0] ?? null

  // Filtrando por status, busca em todas as liberadas; em "Todas", só as 5 últimas.
  const filtered = useMemo(() => {
    if (filter === "all") return recent
    return released.filter((goal) => goal.progressStatus === filter)
  }, [recent, released, filter])

  return (
    <div className="flex flex-col gap-5">
      {next ? <GoalReleaseRefresh releaseDate={next.dueDate} released={next.lockReason !== "date"} /> : null}
      <ToggleGroup
        value={[filter]}
        onValueChange={(value) => value[0] && setFilter(value[0] as Filter)}
        variant="outline"
        className="w-full sm:w-fit"
        aria-label="Filtrar metas"
      >
        <ToggleGroupItem value="all" className="h-9 flex-1 px-4 text-xs sm:flex-none">
          Liberadas <span className="ml-1 tabular-nums text-muted-foreground">{released.length}</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="in_progress" className="h-9 flex-1 px-4 text-xs sm:flex-none">
          Em andamento
        </ToggleGroupItem>
        <ToggleGroupItem value="completed" className="h-9 flex-1 px-4 text-xs sm:flex-none">
          Concluídas
        </ToggleGroupItem>
      </ToggleGroup>

      {filtered.length === 0 && !(filter === "all" && next) ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks />
            </EmptyMedia>
            <EmptyTitle>Nenhuma meta encontrada</EmptyTitle>
            <EmptyDescription>
              {filter === "all" ? "Nenhuma meta liberada até o momento." : "Não há metas com este status no momento."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {filter === "all" && next ? (
            <section aria-labelledby="proximas-metas" className="flex flex-col gap-2">
              <h2 id="proximas-metas" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {upcoming.length === 1 ? "Próxima meta" : "Próximas metas"}
              </h2>
              {upcoming.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </section>
          ) : null}
          {filter === "all" && next && filtered.length > 0 ? (
            <h2 className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Metas liberadas</h2>
          ) : null}
          {filtered.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
          {filter === "all" && earlier.length > 0 ? (
            showEarlier ? (
              earlier.map((goal) => <GoalCard key={goal.id} goal={goal} />)
            ) : (
              <button
                type="button"
                onClick={() => setShowEarlier(true)}
                className="rounded-xl border border-dashed border-border p-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Ver metas anteriores ({earlier.length})
              </button>
            )
          ) : null}
        </div>
      )}
    </div>
  )
}
