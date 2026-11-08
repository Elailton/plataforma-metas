"use client"

import { useEffect, useRef, useState } from "react"
import { Keyboard } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { ESSAY_MAX_BODY, essayDraftKey } from "@/lib/mini-quizzes/essay.mjs"

/**
 * Campo para digitar a redação durante a prova. Fica salvo só neste navegador e aparece
 * preenchido na página do resultado, onde o aluno envia (com ou sem a foto).
 */
export function EssayDraft({ quizId }: { quizId: string }) {
  const key = essayDraftKey(quizId)
  const [text, setText] = useState("")
  const [saved, setSaved] = useState(true)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    try {
      setText(window.localStorage.getItem(key) ?? "")
    } catch {
      // Sem armazenamento no navegador: o campo funciona, mas não guarda o rascunho.
    }
  }, [key])

  function change(value: string) {
    const next = value.slice(0, ESSAY_MAX_BODY)
    setText(next)
    setSaved(false)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, next)
        setSaved(true)
      } catch {
        // ignora
      }
    }, 600)
  }

  return (
    <section aria-labelledby="redacao-digitada" className="flex flex-col gap-2 rounded-xl border-2 border-primary/60 bg-card p-4 md:p-5">
      <h2 id="redacao-digitada" className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Keyboard className="size-5 text-primary" aria-hidden="true" />
        Digite a sua redação aqui <span className="font-normal text-muted-foreground">(opcional)</span>
      </h2>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Pode usar este campo no lugar da folha ou junto com ela. O texto fica salvo neste aparelho e, depois de enviar as respostas,
        aparece pronto para você enviar, com ou sem a foto da folha. <strong className="text-foreground">Atenção:</strong> a correção feita só pelo
        texto digitado é aproximada (não avalia letra, margens e número de linhas) e pode ser imprecisa.
      </p>
      <Textarea
        value={text}
        onChange={(event) => change(event.target.value)}
        rows={14}
        placeholder="Escreva aqui a sua redação."
        className="select-text"
        aria-describedby="redacao-digitada-status"
      />
      <span id="redacao-digitada-status" className="text-right text-xs text-muted-foreground">
        {text ? (saved ? "Rascunho salvo neste aparelho" : "Salvando...") : ""}
      </span>
    </section>
  )
}
