import { FileCheck2 } from "lucide-react"
import { cn } from "@/lib/utils"

/** Selo dos assuntos que caíram na última prova do concurso. */
export function LastExamBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300",
        compact && "px-1.5 text-[10px]",
        className,
      )}
      title="Este assunto foi cobrado na última prova deste concurso"
    >
      <FileCheck2 className={compact ? "size-3" : "size-3.5"} aria-hidden="true" />
      Cobrado no último concurso
    </span>
  )
}
