import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ESSAY_CRITERIA, ESSAY_MAX_SCORE, ESSAY_MIN_SCORE, essayReviewDeadline } from "@/lib/mini-quizzes/essay.mjs"
import type { EssayRow } from "@/lib/mini-quizzes/essay.mjs"
import { formatDateTime } from "./format"

const dateOnly = (value: Date) =>
  value.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Fortaleza" })

/** Situação e resultado de uma redação enviada. */
export function EssayResult({ essay, title, className }: { essay: EssayRow; title?: string; className?: string }) {
  const deadline = essayReviewDeadline(essay.submitted_at)
  const images = essay.image_paths?.length ?? 0
  const sent = [images > 0 ? `${images} ${images === 1 ? "foto" : "fotos"}` : null, essay.body ? "texto colado" : null].filter(Boolean).join(" e ")

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 md:p-5", className)}>
      {title ? <p className="mb-1 text-sm font-semibold text-foreground">{title}</p> : null}
      <p className="mb-3 text-xs text-muted-foreground">
        Enviada em {formatDateTime(essay.submitted_at)}
        {sent ? ` · ${sent}` : ""}
      </p>

      {essay.status === "pending" ? (
        <p className="flex items-start gap-2 text-sm text-foreground">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Aguardando correção. O resultado sai em até 7 dias{deadline ? `, até ${dateOnly(deadline)}` : ""}, aqui e no Relatório.
          </span>
        </p>
      ) : essay.status === "annulled" ? (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="font-semibold">Redação anulada (0/{ESSAY_MAX_SCORE}).</span>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {essay.score_total ?? 0}
              <span className="text-base font-normal text-muted-foreground">/{ESSAY_MAX_SCORE}</span>
            </span>
            <span className={cn("text-xs", (essay.score_total ?? 0) >= ESSAY_MIN_SCORE ? "text-muted-foreground" : "text-destructive")}>
              {(essay.score_total ?? 0) >= ESSAY_MIN_SCORE ? `acima do mínimo de ${ESSAY_MIN_SCORE}` : `abaixo do mínimo de ${ESSAY_MIN_SCORE} (eliminatório na prova)`}
            </span>
          </p>
          <ul className="flex flex-col gap-2">
            {ESSAY_CRITERIA.map((criterion, index) => {
              const score = essay.scores?.[index] ?? 0
              return (
                <li key={criterion} className="grid grid-cols-[minmax(0,1fr)_80px_40px] items-center gap-3 text-sm">
                  <span className="text-foreground">{criterion}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${score * 10}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">{score}/10</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {essay.feedback ? (
        <div className="mt-3 rounded-lg bg-muted/60 px-3 py-2">
          <p className="mb-1 text-xs font-semibold text-foreground">Comentário da correção</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{essay.feedback}</p>
        </div>
      ) : null}
    </div>
  )
}
