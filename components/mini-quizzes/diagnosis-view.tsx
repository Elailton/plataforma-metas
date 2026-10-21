import Link from "next/link"
import { AlertTriangle, ClipboardCheck, Target, TrendingUp } from "lucide-react"
import { SectionHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { cn } from "@/lib/utils"
import type { Diagnosis } from "@/lib/mini-quizzes/core.mjs"
import { barTone, formatDay, formatMonth, scoreTone } from "./format"

export interface DiagnosisHistoryRow {
  id: string
  quizTitle: string
  submitted_at: string
  correct_count: number
  total_count: number
  attempt_number: number
  is_first_of_month: boolean
}

/**
 * Diagnóstico por disciplina e assunto. Usado pelo aluno (o próprio) e pelo
 * administrador (qualquer aluno). Os links de mês preservam a rota atual.
 */
export function DiagnosisView({
  diagnosis,
  history,
  monthHref,
  attemptHref,
}: {
  diagnosis: Diagnosis
  history: DiagnosisHistoryRow[]
  monthHref: (month: string) => string
  attemptHref?: (attemptId: string) => string
}) {
  if (!diagnosis.selectedMonth) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
        <ClipboardCheck className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Ainda não há simulados resolvidos.</p>
        <p className="mt-1 text-sm text-muted-foreground">O diagnóstico aparece depois da primeira tentativa.</p>
      </div>
    )
  }

  const studied = diagnosis.subjects.filter((subject) => subject.total > 0)
  const evolutionMonths = [...diagnosis.months].reverse()

  return (
    <div className="flex flex-col gap-8">
      {diagnosis.months.length > 1 ? (
        <nav aria-label="Mês do diagnóstico" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {diagnosis.months.map((month) => (
            <Link
              key={month}
              href={monthHref(month)}
              aria-current={month === diagnosis.selectedMonth ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                month === diagnosis.selectedMonth
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {formatMonth(month)}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatCard
          label={`Acerto em ${formatMonth(diagnosis.selectedMonth).toLowerCase()}`}
          value={`${diagnosis.overall.percentage}%`}
          hint={`${diagnosis.overall.correct} de ${diagnosis.overall.total} questões`}
          icon={Target}
          tone="primary"
        />
        <StatCard
          label="Mini simulados no mês"
          value={diagnosis.quizzesCounted}
          hint="Conta a 1ª tentativa de cada um"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Assuntos para reforçar"
          value={diagnosis.weakTopics.length}
          hint="Abaixo de 60% de acerto"
          icon={AlertTriangle}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <section aria-labelledby="diagnostico-disciplinas">
        <SectionHeader
          title={<span id="diagnostico-disciplinas">Por disciplina</span>}
          description="Percentual de acerto na primeira tentativa de cada simulado do mês."
        />
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {studied.map((subject) => (
            <details key={subject.id} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{subject.name}</span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className={cn("block h-full rounded-full", barTone(subject.percentage))} style={{ width: `${subject.percentage}%` }} />
                  </span>
                </span>
                <span className="w-20 shrink-0 text-right">
                  <span className={cn("block text-sm font-semibold tabular-nums", scoreTone(subject.percentage))}>{subject.percentage}%</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {subject.correct}/{subject.total}
                  </span>
                </span>
              </summary>
              {subject.topics.length > 0 ? (
                <ul className="flex flex-col gap-2 border-t border-border bg-muted/20 px-4 py-3">
                  {subject.topics.map((topic) => (
                    <li key={topic.id} className="flex items-center gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{topic.title}</span>
                      <span className={cn("shrink-0 tabular-nums font-medium", scoreTone(topic.percentage))}>{topic.percentage}%</span>
                      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                        {topic.correct}/{topic.total}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </details>
          ))}
          {studied.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhuma questão neste mês.</p> : null}
        </div>
      </section>

      {diagnosis.weakTopics.length > 0 ? (
        <section aria-labelledby="diagnostico-reforco">
          <SectionHeader
            title={<span id="diagnostico-reforco">Assuntos para reforçar</span>}
            description="Com pelo menos 3 questões e acerto abaixo de 60%."
          />
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {diagnosis.weakTopics.map((topic) => (
              <li key={`${topic.subjectName}-${topic.id}`} className="flex items-center gap-3 px-4 py-3 text-sm">
                <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{topic.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{topic.subjectName}</span>
                </span>
                <span className={cn("shrink-0 font-semibold tabular-nums", scoreTone(topic.percentage))}>{topic.percentage}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {evolutionMonths.length > 1 ? (
        <section aria-labelledby="diagnostico-evolucao">
          <SectionHeader
            title={<span id="diagnostico-evolucao" className="inline-flex items-center gap-2"><TrendingUp className="size-4" />Evolução mensal</span>}
            description="Acerto por disciplina em cada mês."
          />
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">Disciplina</th>
                  {evolutionMonths.map((month) => (
                    <th key={month} scope="col" className="px-3 py-2.5 text-right font-medium">
                      {formatMonth(month).slice(0, 3)}/{month.slice(2, 4)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diagnosis.subjects
                  .filter((subject) => subject.evolution.some((point) => point.total > 0))
                  .map((subject) => (
                    <tr key={subject.id} className="border-b border-border last:border-0">
                      <th scope="row" className="max-w-[12rem] truncate px-4 py-2.5 text-left font-medium text-foreground">{subject.name}</th>
                      {subject.evolution.map((point) => (
                        <td key={point.month} className={cn("px-3 py-2.5 text-right tabular-nums", point.percentage === null ? "text-muted-foreground" : scoreTone(point.percentage))}>
                          {point.percentage === null ? "—" : `${point.percentage}%`}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {history.length > 0 ? (
        <section aria-labelledby="diagnostico-historico">
          <SectionHeader
            title={<span id="diagnostico-historico">Histórico de tentativas</span>}
            description="Todas as tentativas ficam guardadas. Refazer não altera o diagnóstico do mês."
          />
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {history.map((attempt) => {
              const score = attempt.total_count ? Math.round((attempt.correct_count / attempt.total_count) * 100) : 0
              const content = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{attempt.quizTitle}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDay(attempt.submitted_at)} · {attempt.attempt_number}ª tentativa
                      {attempt.is_first_of_month ? " · conta no diagnóstico" : ""}
                    </span>
                  </span>
                  <span className={cn("shrink-0 font-semibold tabular-nums", scoreTone(score))}>
                    {attempt.correct_count}/{attempt.total_count}
                  </span>
                </>
              )
              return (
                <li key={attempt.id}>
                  {attemptHref ? (
                    <Link href={attemptHref(attempt.id)} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/40">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 text-sm">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
