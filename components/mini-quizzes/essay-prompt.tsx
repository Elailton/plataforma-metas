import { PenLine } from "lucide-react"
import { cn } from "@/lib/utils"
import { RichText } from "./rich-text"

/** Proposta de redação do simulado (opcional, corrigida fora da plataforma). */
export function EssayPrompt({ prompt, className, afterSubmit = false }: { prompt: string; className?: string; afterSubmit?: boolean }) {
  return (
    <section aria-labelledby="proposta-redacao" className={cn("rounded-xl border border-primary/40 bg-card p-4 md:p-5", className)}>
      <div className="mb-3 flex items-center gap-2">
        <PenLine className="size-5 text-primary" aria-hidden="true" />
        <h2 id="proposta-redacao" className="text-base font-semibold text-foreground">
          Redação <span className="font-normal text-muted-foreground">(opcional)</span>
        </h2>
      </div>
      <p className="mb-4 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        A redação não é corrigida aqui na prova: escreva à mão, numa folha, dentro do tempo da prova.
        {afterSubmit
          ? " Abaixo, anexe a foto da folha ou cole o texto. A correção sai em até 7 dias, no Relatório."
          : " Depois de enviar as respostas, você poderá anexar a foto da folha ou colar o texto. A correção sai em até 7 dias, no Relatório. Quem não quiser fazer a redação envia só as questões."}
      </p>
      <RichText text={prompt} className="text-sm leading-relaxed text-foreground" />
    </section>
  )
}
