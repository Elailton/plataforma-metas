import { CalendarDays } from "lucide-react"

/** Contador de dias até a prova (tela inicial do aluno). */
export function ExamCountdownCard({ label, date, status }: { label: string; date: string; status: "confirmada" | "prevista" }) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
        <CalendarDays className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-base font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          Prova em {date}
          {status === "prevista" ? " (data prevista, pode mudar)" : ""}
        </p>
      </div>
    </div>
  )
}
