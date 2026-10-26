"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Play, Timer, Trophy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { startMiniQuiz } from "@/lib/mini-quizzes/actions"
import { formatDateTime } from "./format"

/** Antes de começar: escolha do ranking (só na 1ª tentativa) e início do cronômetro no banco. */
export function QuizStart({
  quizId,
  questionCount,
  firstAttempt,
  rankingEnabled = true,
}: {
  quizId: string
  questionCount: number
  firstAttempt: boolean
  rankingEnabled?: boolean
}) {
  const router = useRouter()
  const askRanking = firstAttempt && rankingEnabled
  const [ranking, setRanking] = useState<boolean | null>(askRanking ? null : false)
  const [pending, setPending] = useState(false)

  async function start() {
    if (ranking === null) return
    setPending(true)
    try {
      const result = await startMiniQuiz(quizId, ranking)
      if (!result.ok) {
        toast.error(result.nextAvailableAt ? `${result.error} Liberado em ${formatDateTime(result.nextAvailableAt)}.` : result.error)
        return
      }
      router.refresh()
    } catch {
      toast.error("Não foi possível iniciar. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
          <Timer className="size-4.5" />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-foreground">Antes de começar</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            São {questionCount} questões. O cronômetro começa quando você clicar em <strong className="text-foreground">Iniciar diagnóstico</strong> e
            só para quando você conferir suas respostas e enviar. Durante a prova não é possível copiar o texto das questões.
          </p>
        </div>
      </div>

      {askRanking ? (
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="size-4 text-primary" aria-hidden="true" />
            Deseja aparecer no ranking deste diagnóstico?
          </legend>
          {[
            { value: true, title: "Sim, quero aparecer", hint: "Seu primeiro nome e a inicial do sobrenome aparecem com acertos e tempo." },
            { value: false, title: "Não, prefiro ficar fora", hint: "Você vê o ranking, mas seu nome não aparece nele." },
          ].map((option) => {
            const checked = ranking === option.value
            return (
              <label
                key={String(option.value)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="ranking"
                  className="mt-1 accent-[var(--primary)]"
                  checked={checked}
                  onChange={() => setRanking(option.value)}
                />
                <span>
                  <span className="block font-medium text-foreground">{option.title}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
              </label>
            )
          })}
          <p className="text-xs text-muted-foreground">A escolha não pode ser mudada depois de iniciar.</p>
        </fieldset>
      ) : firstAttempt ? null : (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Esta é uma nova tentativa: ela fica no seu histórico, mas não muda o ranking.
        </p>
      )}

      <div>
        <Button onClick={start} disabled={pending || ranking === null}>
          <Play data-icon="inline-start" />
          {pending ? "Iniciando..." : "Iniciar diagnóstico"}
        </Button>
      </div>
    </div>
  )
}
