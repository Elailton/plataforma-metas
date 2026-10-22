"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, Play, RotateCcw, Send, Timer, Upload, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import { cn } from "@/lib/utils"
import { RichText } from "@/components/mini-quizzes/rich-text"
import { AttemptReview } from "@/components/mini-quizzes/attempt-review"
import { formatClock, formatDuration, percentage } from "@/lib/mini-quizzes/core.mjs"
import type { AlternativeKey } from "@/lib/mini-quizzes/core.mjs"
import { setWeeklyDiagnosticGroups, setWeeklyDiagnosticStatus } from "@/lib/admin/actions/mini-quizzes"

export interface PreviewQuestion {
  id: string
  statement: string
  alternatives: Array<{ key: AlternativeKey; text: string }>
  correctKey: AlternativeKey
  explanation: string
  subjectName: string
}

/** Para quais grupos o diagnóstico vale. Fluxo: lançar no Grupo 3 (teste), conferir e depois liberar. */
export function WeeklyDiagnosticGroups({ quizId, groups }: { quizId: string; groups: number[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<number[]>(groups)
  const [pending, setPending] = useState(false)
  const changed = [...selected].sort().join(",") !== [...groups].sort().join(",")
  async function save() {
    setPending(true)
    try {
      const result = await setWeeklyDiagnosticGroups(quizId, selected)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Grupos atualizados.")
      router.refresh()
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <span className="font-medium text-foreground">Liberado para:</span>
      {[1, 2, 3].map((group) => (
        <label key={group} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.includes(group)}
            onChange={(event) =>
              setSelected((current) => (event.target.checked ? [...current, group] : current.filter((g) => g !== group)))
            }
          />
          {group === 3 ? "Grupo 3 (teste)" : `Grupo ${group}`}
        </label>
      ))}
      <Button size="sm" variant="outline" onClick={save} disabled={pending || !changed || selected.length === 0}>
        {pending ? "Salvando..." : "Salvar grupos"}
      </Button>
    </div>
  )
}

/** Publicar / voltar para rascunho. */
export function WeeklyDiagnosticStatusButton({ quizId, status }: { quizId: string; status: "draft" | "published" | "archived" }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const next = status === "published" ? "draft" : "published"
  async function toggle() {
    setPending(true)
    try {
      const result = await setWeeklyDiagnosticStatus(quizId, next)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(next === "published" ? "Diagnóstico publicado para os alunos." : "Diagnóstico voltou para rascunho.")
      router.refresh()
    } finally {
      setPending(false)
    }
  }
  return (
    <Button onClick={toggle} disabled={pending} variant={next === "published" ? "default" : "outline"}>
      {next === "published" ? <Upload data-icon="inline-start" /> : <Undo2 data-icon="inline-start" />}
      {pending ? "Salvando..." : next === "published" ? "Publicar para os alunos" : "Voltar para rascunho"}
    </Button>
  )
}

/**
 * Prévia do administrador: resolve como o aluno (cronômetro, sem copiar) e vê a
 * correção comentada no fim. Nada é gravado: não cria tentativa nem entra no ranking.
 */
export function WeeklyDiagnosticPreview({ questions }: { questions: PreviewQuestion[] }) {
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro")
  const [answers, setAnswers] = useState<Record<string, AlternativeKey>>({})
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState<number | null>(null)
  const answered = Object.keys(answers).length

  useEffect(() => {
    if (phase !== "running" || startedAt === null) return
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    tick()
    const timer = window.setInterval(tick, 1000)
    const block = (event: Event) => event.preventDefault()
    for (const type of ["copy", "cut", "contextmenu", "dragstart", "selectstart"]) document.addEventListener(type, block)
    return () => {
      window.clearInterval(timer)
      for (const type of ["copy", "cut", "contextmenu", "dragstart", "selectstart"]) document.removeEventListener(type, block)
    }
  }, [phase, startedAt])

  const result = useMemo(() => {
    if (phase !== "done") return null
    const reviewed = questions.map((question, index) => ({
      id: question.id,
      position: index,
      statement: question.statement,
      alternatives: question.alternatives,
      chosenKey: answers[question.id] ?? null,
      correctKey: question.correctKey,
      isCorrect: answers[question.id] === question.correctKey,
      explanation: question.explanation,
    }))
    const bySubject = new Map<string, { correct: number; total: number }>()
    questions.forEach((question, index) => {
      const entry = bySubject.get(question.subjectName) ?? { correct: 0, total: 0 }
      entry.total += 1
      if (reviewed[index].isCorrect) entry.correct += 1
      bySubject.set(question.subjectName, entry)
    })
    return { reviewed, correct: reviewed.filter((row) => row.isCorrect).length, bySubject: [...bySubject.entries()] }
  }, [phase, questions, answers])

  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/50 bg-card p-4 md:p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Eye className="size-4 text-primary" aria-hidden="true" />
          Prévia como aluno
        </p>
        <p className="text-sm text-muted-foreground">
          Resolva como o aluno vai resolver: cronômetro rodando e sem copiar o texto. No fim aparece a correção comentada. Nada é salvo e
          nada entra no ranking.
        </p>
        <div>
          <Button
            onClick={() => {
              setAnswers({})
              setStartedAt(Date.now())
              setPhase("running")
            }}
          >
            <Play data-icon="inline-start" />
            Iniciar prévia
          </Button>
        </div>
      </div>
    )
  }

  if (phase === "done" && result) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Acertos" value={result.correct} suffix={`/ ${questions.length}`} tone="success" />
          <StatCard label="Aproveitamento" value={`${percentage(result.correct, questions.length)}%`} tone="primary" />
          <StatCard label="Tempo" value={formatDuration(duration)} />
          <StatCard label="Em branco" value={questions.length - answered} />
        </div>
        <ul className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-sm">
          {result.bySubject.map(([name, entry]) => (
            <li key={name} className="flex justify-between gap-3">
              <span className="truncate">{name}</span>
              <span className="tabular-nums text-muted-foreground">
                {entry.correct}/{entry.total}
              </span>
            </li>
          ))}
        </ul>
        <div>
          <Button variant="outline" onClick={() => setPhase("intro")}>
            <RotateCcw data-icon="inline-start" />
            Fazer a prévia de novo
          </Button>
        </div>
        <AttemptReview questions={result.reviewed} />
      </div>
    )
  }

  return (
    <div className="flex select-none flex-col gap-5 [-webkit-touch-callout:none]">
      <ol className="flex flex-col gap-5">
        {questions.map((question, index) => (
          <li key={question.id} className="rounded-xl border border-border bg-card p-4 md:p-5">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{question.subjectName}</p>
            <div className="mb-3 flex gap-2 text-sm leading-relaxed text-foreground">
              <span className="shrink-0 font-semibold tabular-nums text-primary">{String(index + 1).padStart(2, "0")}.</span>
              <RichText text={question.statement} className="min-w-0 flex-1" />
            </div>
            <div className="flex flex-col gap-2">
              {question.alternatives.map((alternative) => {
                const checked = answers[question.id] === alternative.key
                return (
                  <button
                    type="button"
                    key={alternative.key}
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: alternative.key }))}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm leading-relaxed transition-colors",
                      checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                      )}
                    >
                      {alternative.key}
                    </span>
                    <RichText text={alternative.text} className="min-w-0 flex-1 pt-0.5" />
                  </button>
                )
              })}
            </div>
          </li>
        ))}
      </ol>
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
        <span className="flex items-center gap-3 text-sm tabular-nums text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <Timer className="size-4 text-primary" aria-hidden="true" />
            {formatClock(elapsed)}
          </span>
          {answered} de {questions.length}
        </span>
        <Button
          onClick={() => {
            setDuration(startedAt === null ? null : Math.floor((Date.now() - startedAt) / 1000))
            setPhase("done")
            window.scrollTo(0, 0)
          }}
        >
          <Send data-icon="inline-start" />
          Enviar (prévia)
        </Button>
      </div>
    </div>
  )
}
