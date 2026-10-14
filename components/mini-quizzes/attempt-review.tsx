import { CheckCircle2, CircleMinus, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReviewedQuestion } from "@/lib/mini-quizzes/queries"
import { RichText } from "./rich-text"

/** Correção comentada de uma tentativa enviada. */
export function AttemptReview({ questions }: { questions: ReviewedQuestion[] }) {
  return (
    <ol className="flex flex-col gap-5">
      {questions.map((question, index) => {
        const status = question.chosenKey === null ? "blank" : question.isCorrect ? "correct" : "wrong"
        return (
          <li key={question.id} className="rounded-xl border border-border bg-card p-4 md:p-5">
            <div className="mb-3 flex items-start gap-2 text-sm leading-relaxed text-foreground">
              <span className="shrink-0 font-semibold tabular-nums text-primary">{String(index + 1).padStart(2, "0")}.</span>
              <RichText text={question.statement} className="min-w-0 flex-1" />
              {status === "correct" ? (
                <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Acertou" />
              ) : status === "wrong" ? (
                <XCircle className="size-5 shrink-0 text-destructive" aria-label="Errou" />
              ) : (
                <CircleMinus className="size-5 shrink-0 text-muted-foreground" aria-label="Em branco" />
              )}
            </div>
            <ul className="flex flex-col gap-2">
              {question.alternatives.map((alternative) => {
                const isCorrect = alternative.key === question.correctKey
                const isChosen = alternative.key === question.chosenKey
                return (
                  <li
                    key={alternative.key}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm leading-relaxed",
                      isCorrect
                        ? "border-success/60 bg-success/10"
                        : isChosen
                          ? "border-destructive/50 bg-destructive/10"
                          : "border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        isCorrect
                          ? "border-success bg-success text-success-foreground"
                          : isChosen
                            ? "border-destructive bg-destructive text-white"
                            : "border-border text-muted-foreground",
                      )}
                    >
                      {alternative.key}
                    </span>
                    <RichText text={alternative.text} className="min-w-0 flex-1 pt-0.5" />
                    {isChosen ? <span className="shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">Sua resposta</span> : null}
                  </li>
                )
              })}
            </ul>
            {question.explanation ? (
              <details className="mt-3 rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
                <summary className="cursor-pointer font-medium text-foreground">
                  Comentário {question.correctKey ? `· gabarito ${question.correctKey}` : ""}
                </summary>
                <RichText text={question.explanation} className="mt-2 leading-relaxed text-muted-foreground" />
              </details>
            ) : question.correctKey ? (
              <p className="mt-3 text-sm text-muted-foreground">Gabarito: {question.correctKey}</p>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
