import { Camera, Download, FileText, PenLine, Sparkles, Timer } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

/** Antes de iniciar o simulado com redação: folha para baixar e orientações importantes. */
export function EssayPrep({ sheetUrl }: { sheetUrl: string | null }) {
  return (
    <section aria-labelledby="redacao-preparo" className="flex flex-col gap-4 rounded-xl border-2 border-primary bg-card p-4 md:p-6">
      <p className="flex gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs leading-relaxed text-foreground">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          <strong>Novidade em teste:</strong> estamos sempre melhorando o seu SGA e, neste simulado, vamos testar a correção de redações. Por ser
          um teste, ainda não está definido se todos os simulados terão redação nem se a correção vai continuar sempre deste jeito.
        </span>
      </p>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
          <PenLine className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h2 id="redacao-preparo" className="text-base font-semibold text-foreground">
            Redação: prepare-se ANTES de iniciar
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Este simulado reproduz a sua prova: questões e redação no mesmo tempo. <strong className="text-foreground">O cronômetro não pode ser pausado.</strong>{" "}
            Por isso, baixe e imprima a folha de redação agora, antes de clicar em Iniciar.
          </p>
        </div>
      </div>

      {sheetUrl ? (
        <a href={sheetUrl} download className={buttonVariants({ size: "lg" })}>
          <Download data-icon="inline-start" />
          Baixar folha de redação (PDF)
        </a>
      ) : null}

      <ol className="flex flex-col gap-3 text-sm leading-relaxed text-foreground">
        <li className="flex gap-2.5">
          <Timer className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>Antes de iniciar:</strong> imprima a folha, separe caneta de tinta azul ou preta e reserve o tempo total da prova sem
            interrupções. O tema só aparece depois de iniciar, no fim da prova, como no dia da prova.
          </span>
        </li>
        <li className="flex gap-2.5">
          <FileText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>A redação é opcional e faz parte do tempo da prova.</strong> No fim da prova, você pode: não fazer a redação; anexar só a foto da
            folha; só digitar o texto; ou os dois. Ela é enviada <strong>junto com as respostas</strong>: depois do envio, não é possível mandar a redação.
          </span>
        </li>
        <li className="flex gap-2.5">
          <Camera className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>Foto da folha:</strong> fotografe de cima, com a folha reta, em lugar bem iluminado, sem sombra e sem flash. Os 4 quadrados pretos dos
            cantos devem aparecer: é assim que você confere que a folha inteira saiu. Tire a foto e anexe antes de enviar as respostas, ainda dentro do tempo.{" "}
            <strong className="text-destructive">Letra ilegível ou foto embaçada, escura ou cortada leva à ANULAÇÃO, sem recurso.</strong>
          </span>
        </li>
        <li className="flex gap-2.5">
          <PenLine className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>Campo de texto:</strong> no fim da prova, logo abaixo do tema, há um campo para digitar a redação, no lugar da folha ou junto com ela.
            A correção feita só pelo texto digitado é{" "}
            <strong>aproximada</strong>: não dá para avaliar letra, margens e número de linhas da folha, então o resultado pode ser impreciso.
          </span>
        </li>
      </ol>
    </section>
  )
}
