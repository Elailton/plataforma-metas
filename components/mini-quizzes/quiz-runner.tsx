"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Send, Timer } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { submitMiniQuiz } from "@/lib/mini-quizzes/actions"
import type { QuizQuestion } from "@/lib/mini-quizzes/queries"
import { cn } from "@/lib/utils"
import { formatDateTime } from "./format"
import { RichText } from "./rich-text"
import { elapsedSeconds, formatClock } from "@/lib/mini-quizzes/core.mjs"

/** Resolução com cronômetro (início registrado pelo banco). As respostas só saem do navegador no envio. */
export function QuizRunner({ quizId, questions, startedAt }: { quizId: string; questions: QuizQuestion[]; startedAt: string | null }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const answered = useMemo(() => questions.filter((question) => answers[question.id]).length, [answers, questions])
  const unanswered = questions.length - answered
  const [elapsed, setElapsed] = useState(() => (startedAt ? elapsedSeconds(startedAt) : 0))

  useEffect(() => {
    if (!startedAt || submitted) return
    const tick = () => setElapsed(elapsedSeconds(startedAt))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt, submitted])

  useEffect(() => {
    if (answered === 0 || submitted) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [answered, submitted])

  async function send() {
    setConfirmOpen(false)
    setPending(true)
    try {
      const result = await submitMiniQuiz(quizId, answers)
      if (!result.ok) {
        toast.error(result.nextAvailableAt ? `${result.error} Liberado em ${formatDateTime(result.nextAvailableAt)}.` : result.error)
        return
      }
      setSubmitted(true)
      router.push(`/aluno/mini-simulados/tentativas/${result.attemptId}`)
    } catch {
      toast.error("Não foi possível enviar suas respostas. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-col gap-5">
        {questions.map((question, index) => (
          <li key={question.id} className="rounded-xl border border-border bg-card p-4 md:p-5">
            <fieldset>
              <legend className="mb-3 flex gap-2 text-sm leading-relaxed text-foreground">
                <span className="shrink-0 font-semibold tabular-nums text-primary">{String(index + 1).padStart(2, "0")}.</span>
                <RichText text={question.statement} className="min-w-0 flex-1" />
              </legend>
              <div className="flex flex-col gap-2">
                {question.alternatives.map((alternative) => {
                  const checked = answers[question.id] === alternative.key
                  return (
                    <label
                      key={alternative.key}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm leading-relaxed transition-colors",
                        checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${question.id}`}
                        value={alternative.key}
                        checked={checked}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: alternative.key }))}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                        )}
                      >
                        {alternative.key}
                      </span>
                      <RichText text={alternative.text} className="min-w-0 flex-1 pt-0.5" />
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur md:bottom-4">
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground tabular-nums">
          {startedAt ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground" aria-label={`Tempo de prova ${formatClock(elapsed)}`}>
              <Timer className="size-4 text-primary" aria-hidden="true" />
              <span role="timer">{formatClock(elapsed)}</span>
            </span>
          ) : null}
          <span>
            {answered} de {questions.length} respondidas
          </span>
        </span>
        <Button onClick={() => (unanswered > 0 ? setConfirmOpen(true) : send())} disabled={pending || answered === 0}>
          <Send data-icon="inline-start" />
          {pending ? "Enviando..." : "Enviar respostas"}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar com questões em branco?</AlertDialogTitle>
            <AlertDialogDescription>
              {unanswered === 1 ? "1 questão está sem resposta" : `${unanswered} questões estão sem resposta`} e contará como erro.
              Ao enviar, o cronômetro para e uma nova tentativa só fica liberada em 7 dias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar resolvendo</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Enviar mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
