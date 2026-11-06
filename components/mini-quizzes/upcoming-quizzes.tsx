import { CalendarClock, Lock } from "lucide-react"
import { upcomingReason, type UpcomingQuiz } from "@/lib/mini-quizzes/core.mjs"

/** Data de hoje (AAAA-MM-DD) no fuso usado pelo banco para liberar simulados. */
function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date())
}

/** Próximos simulados fechados: título e condição para abrir, sem link nem conteúdo. */
export function UpcomingQuizzes({ items }: { items: UpcomingQuiz[] }) {
  if (items.length === 0) return null
  const today = todayKey()
  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-dashed border-border bg-card">
      {items.map((item) => {
        const reason = upcomingReason(item, today)
        return (
          <li key={item.quiz_id ?? `${item.kind}-${item.block_end ?? item.release_date ?? item.title}`} className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
              {reason.type === "date" ? <CalendarClock className="size-4.5" /> : <Lock className="size-4.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-muted-foreground">{item.title}</span>
              <span className="block truncate text-xs text-muted-foreground">Bloqueado · {reason.label}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
