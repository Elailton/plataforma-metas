"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, FileText } from "lucide-react"
import { formatPassage } from "@/lib/mini-quizzes/passage.mjs"
import { splitStatement } from "@/lib/mini-quizzes/statement.mjs"
import { cn } from "@/lib/utils"
import { RichText } from "./rich-text"

/**
 * Enunciado da questão. Quando há "Texto associado", o texto-base fica num quadro que o aluno
 * recolhe e expande; o comando da questão fica sempre visível.
 * Só usa elementos de frase (span/button), porque pode estar dentro de <legend>.
 */
export function QuestionStatement({ statement, className }: { statement: string; className?: string }) {
  const { passage, body } = splitStatement(statement)
  const [open, setOpen] = useState(true)
  if (!passage) return <RichText text={body} className={className} />
  return (
    <span className={cn("block min-w-0", className)}>
      <span className="mb-3 block overflow-hidden rounded-lg border border-border bg-muted/40">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted"
        >
          <FileText className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">Texto associado</span>
          <span className="inline-flex items-center gap-1 font-medium normal-case tracking-normal text-primary">
            {open ? "Recolher" : "Expandir"}
            {open ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
          </span>
        </button>
        {open ? <Passage text={passage} /> : null}
      </span>
      <RichText text={body} />
    </span>
  )
}

/** Texto-base compacto: parágrafos com recuo de primeira linha, sem linhas em branco entre eles. */
function Passage({ text }: { text: string }) {
  return (
    <span className="block border-t border-border px-3 py-3 text-justify leading-normal [hyphens:auto]" lang="pt-BR">
      {formatPassage(text).map((part, index) => {
        if (part.kind === "label") {
          return (
            <span key={index} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {part.text}
            </span>
          )
        }
        if (part.kind === "title") return <RichText key={index} text={part.text} className="mb-1 text-left font-semibold" />
        if (part.kind === "verse") return <RichText key={index} text={part.text} className="my-1 text-left" />
        if (part.kind === "source") {
          return <RichText key={index} text={part.text} className="mt-2 text-left text-xs text-muted-foreground" />
        }
        return <RichText key={index} text={part.text} className="[text-indent:1.5em]" />
      })}
    </span>
  )
}
