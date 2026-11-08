import { Download, PenLine } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { parseEssayPrompt } from "@/lib/mini-quizzes/essay.mjs"
import { cn } from "@/lib/utils"
import { RichText } from "./rich-text"

/** Proposta de redação do simulado (opcional, corrigida fora da plataforma). */
export function EssayPrompt({ prompt, className, afterSubmit = false }: { prompt: string; className?: string; afterSubmit?: boolean }) {
  const { text, sheetUrl } = parseEssayPrompt(prompt)
  return (
    <section aria-labelledby="proposta-redacao" className={cn("rounded-xl border border-primary/40 bg-card p-4 md:p-5", className)}>
      <div className="mb-3 flex items-center gap-2">
        <PenLine className="size-5 text-primary" aria-hidden="true" />
        <h2 id="proposta-redacao" className="text-base font-semibold text-foreground">
          Redação <span className="font-normal text-muted-foreground">(opcional)</span>
        </h2>
      </div>
      <p className="mb-4 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        A redação não é corrigida na hora: escreva à mão na folha de redação e/ou digite no campo abaixo, dentro do tempo da prova.
        {afterSubmit
          ? " Abaixo, envie a foto da folha, o texto digitado ou os dois. A correção sai em até 7 dias, no Relatório."
          : " Depois de enviar as respostas, você poderá enviar a foto da folha, o texto digitado ou os dois. A correção sai em até 7 dias, no Relatório. Quem não quiser fazer a redação envia só as questões."}
      </p>
      {sheetUrl && !afterSubmit ? (
        <a href={sheetUrl} download className={buttonVariants({ variant: "outline", className: "mb-4" })}>
          <Download data-icon="inline-start" />
          Baixar folha de redação (PDF)
        </a>
      ) : null}
      <RichText text={text} className="text-sm leading-relaxed text-foreground" />
    </section>
  )
}
