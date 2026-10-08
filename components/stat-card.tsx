import type React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Indicador numérico padrão (painel do aluno e do administrador). */
export function StatCard({
  label,
  value,
  suffix,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string
  value: React.ReactNode
  suffix?: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
  tone?: "default" | "success" | "primary"
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-4 md:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-2xl font-semibold leading-none tabular-nums tracking-tight md:text-3xl",
            tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : "text-foreground",
          )}
        >
          {value}
        </span>
        {suffix ? <span className="text-sm text-muted-foreground tabular-nums">{suffix}</span> : null}
      </div>
      {hint ? <span className="text-xs leading-snug text-muted-foreground">{hint}</span> : null}
    </div>
  )
}
