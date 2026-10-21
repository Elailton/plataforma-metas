import Link from "next/link"
import { ArrowRight, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDuration } from "@/lib/mini-quizzes/core.mjs"
import type { RankingRow } from "@/lib/mini-quizzes/queries"

const MEDAL = ["text-primary", "text-zinc-300", "text-amber-600"]

/** Ranking de um diagnóstico: acertos e, no empate, o menor tempo. Só aparece quem escolheu participar. */
export function RankingCard({
  rows,
  title = "Ranking",
  subtitle,
  href,
  hrefLabel = "Abrir",
  emptyText = "Ninguém entrou no ranking ainda. Faça o diagnóstico e escolha aparecer.",
  className,
}: {
  rows: RankingRow[]
  title?: string
  subtitle?: string
  href?: string
  hrefLabel?: string
  emptyText?: string
  className?: string
}) {
  const participants = rows[0]?.participants ?? 0
  const me = rows.find((row) => row.is_me)
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 md:p-5", className)} aria-label={title}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="size-4 text-primary" aria-hidden="true" />
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {subtitle ?? "Mais acertos primeiro; no empate, o menor tempo."}
            {participants > 0 ? ` · ${participants} ${participants === 1 ? "participante" : "participantes"}` : null}
          </p>
        </div>
        {href ? (
          <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-primary hover:underline">
            {hrefLabel}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ol className="flex flex-col">
          {rows.map((row, index) => {
            const gap = index > 0 && row.rank > rows[index - 1].rank + 1
            return (
              <li key={`${row.rank}-${row.display_name}`}>
                {gap ? <div className="py-1 text-center text-xs text-muted-foreground" aria-hidden="true">···</div> : null}
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm",
                    row.is_me ? "bg-primary/10 ring-1 ring-primary/40" : null,
                  )}
                >
                  <span
                    className={cn(
                      "w-6 shrink-0 text-center font-semibold tabular-nums",
                      row.rank <= 3 ? MEDAL[row.rank - 1] : "text-muted-foreground",
                    )}
                  >
                    {row.rank}º
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {row.display_name}
                    {row.is_me ? <span className="ml-1.5 text-xs font-normal text-primary">você</span> : null}
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block font-semibold text-foreground">
                      {row.correct_count}/{row.total_count}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">{formatDuration(row.duration_seconds)}</span>
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {rows.length > 0 && !me ? (
        <p className="mt-3 text-xs text-muted-foreground">Você não aparece neste ranking.</p>
      ) : null}
    </section>
  )
}
