import { CheckCircle2, CircleDashed, Lock, PlayCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Status = "pending" | "in_progress" | "completed" | "locked"

const statusConfig: Record<Status, { label: string; icon: typeof CheckCircle2; className: string }> = {
  locked: {
    label: "Bloqueada",
    icon: Lock,
    className: "bg-secondary text-muted-foreground border-border",
  },
  completed: {
    label: "Concluída",
    icon: CheckCircle2,
    className: "bg-success/15 text-success border-success/20 dark:text-success",
  },
  in_progress: {
    label: "Em andamento",
    icon: PlayCircle,
    className: "bg-secondary text-foreground border-border",
  },
  pending: {
    label: "Pendente",
    icon: CircleDashed,
    className: "bg-muted text-muted-foreground border-transparent",
  },
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", config.className, className)}>
      <Icon className="size-3.5" />
      {config.label}
    </Badge>
  )
}
