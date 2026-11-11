"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { gradeMiniQuizEssay } from "@/lib/mini-quizzes/essay-actions"
import { ESSAY_CRITERIA, ESSAY_MAX_SCORE } from "@/lib/mini-quizzes/essay.mjs"

/** Registro do resultado da redação (corrigida fora da plataforma). */
export function EssayGradeForm({
  essayId,
  status,
  scores,
  feedback,
}: {
  essayId: string
  status: "pending" | "graded" | "annulled"
  scores: number[] | null
  feedback: string | null
}) {
  const router = useRouter()
  const [values, setValues] = useState<string[]>(ESSAY_CRITERIA.map((_, index) => (scores?.[index] ?? "").toString()))
  const [note, setNote] = useState(feedback ?? "")
  const [pending, setPending] = useState(false)
  const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0)

  async function save(next: "graded" | "annulled" | "pending") {
    setPending(true)
    try {
      const result = await gradeMiniQuizEssay(essayId, next, values, note)
      if (!result.ok) toast.error(result.error)
      else { toast.success(next === "graded" ? "Resultado salvo." : next === "annulled" ? "Redação anulada." : "Voltou para a fila."); router.refresh() }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {ESSAY_CRITERIA.map((criterion, index) => (
          <label key={criterion} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground">{criterion}</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={10}
              step={1}
              value={values[index]}
              onChange={(event) => setValues((current) => current.map((value, i) => (i === index ? event.target.value : value)))}
              className="w-20 text-right"
              aria-label={`${criterion} (0 a 10)`}
            />
          </label>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Total: <span className="font-semibold tabular-nums text-foreground">{total}</span>/{ESSAY_MAX_SCORE}
      </p>
      <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Comentário para o aluno (opcional; em caso de anulação, o motivo)." />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save("graded")} disabled={pending}>
          {status === "graded" ? "Atualizar nota" : "Salvar nota"}
        </Button>
        <Button variant="destructive" onClick={() => save("annulled")} disabled={pending}>
          Anular
        </Button>
        {status !== "pending" ? (
          <Button variant="outline" onClick={() => save("pending")} disabled={pending}>
            Voltar para a fila
          </Button>
        ) : null}
      </div>
    </div>
  )
}
