import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AdminGoal } from "@/lib/admin/types"
import { formatDate } from "@/lib/format"

export function AdminGoalRow({ goal }: { goal: AdminGoal }) {
  return (
    <Link
      href={`/admin/cursos/${goal.courseId}/metas/${goal.id}`}
      className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-secondary/50"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{goal.title}</span>
        <span className="text-xs text-muted-foreground">
          {goal.dueDate ? `${formatDate(goal.dueDate)} · ` : ""}
          {goal.items.length} {goal.items.length === 1 ? "item" : "itens"}
        </span>
      </div>
      <Badge variant={goal.status === "published" ? "default" : "secondary"} className="shrink-0">
        {goal.status === "published" ? "Publicada" : "Rascunho"}
      </Badge>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}
