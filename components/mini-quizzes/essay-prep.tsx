import { Camera, Download, FileText, PenLine, Timer } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

/** Antes de iniciar o simulado com redação: folha para baixar e orientações importantes. */
export function EssayPrep({ sheetUrl }: { sheetUrl: string | null }) {
  return (
    <section aria-labelledby="redacao-preparo" className="flex flex-col gap-4 rounded-xl border-2 border-primary bg-card p-4 md:p-6">
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
            interrupções. O tema aparece na folha e no fim da prova.
          </span>
        </li>
        <li className="flex gap-2.5">
          <FileText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>A redação é opcional.</strong> Depois de enviar as questões, você pode: não fazer a redação; enviar só a foto da folha; enviar só o
            texto digitado no campo da plataforma; ou enviar os dois.
          </span>
        </li>
        <li className="flex gap-2.5">
          <Camera className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>Foto da folha:</strong> fotografe de cima, com a folha reta, em lugar bem iluminado, sem sombra e sem flash. Os 4 quadrados pretos dos
            cantos devem aparecer: é assim que você confere que a folha inteira saiu. Confira se a foto está nítida antes de enviar.{" "}
            <strong className="text-destructive">Letra ilegível ou foto embaçada, escura ou cortada leva à ANULAÇÃO, sem recurso.</strong>
          </span>
        </li>
        <li className="flex gap-2.5">
          <PenLine className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>Campo de texto:</strong> você também pode digitar a redação na plataforma. A correção feita só pelo texto digitado é{" "}
            <strong>aproximada</strong>: não dá para avaliar letra, margens e número de linhas da folha, então o resultado pode ser impreciso.
          </span>
        </li>
      </ol>
    </section>
  )
}
