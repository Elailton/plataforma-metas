"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Camera, Download, Play, Timer, Trophy } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { startMiniQuiz } from "@/lib/mini-quizzes/actions"
import { formatDateTime } from "./format"

/** Antes de começar: escolha do ranking (só na 1ª tentativa) e início do cronômetro no banco. */
export function QuizStart({
  quizId,
  questionCount,
  firstAttempt,
  rankingEnabled = true,
  noun = "diagnóstico",
  essay = null,
}: {
  quizId: string
  questionCount: number
  firstAttempt: boolean
  rankingEnabled?: boolean
  /** Como chamar a prova nos textos: "diagnóstico" ou "simulado". */
  noun?: "diagnóstico" | "simulado"
  /** Simulado com redação: 2 avisos antes de iniciar (folha impressa; foto e anulação). */
  essay?: { sheetUrl: string | null } | null
}) {
  const router = useRouter()
  const askRanking = firstAttempt && rankingEnabled
  const [ranking, setRanking] = useState<boolean | null>(askRanking ? null : false)
  const [pending, setPending] = useState(false)
  const [warning, setWarning] = useState<0 | 1 | 2>(0)
  const [okSheet, setOkSheet] = useState(false)
  const [okPhoto, setOkPhoto] = useState(false)

  function requestStart() {
    if (ranking === null) return
    if (!essay) return void start()
    setOkSheet(false)
    setOkPhoto(false)
    setWarning(1)
  }

  async function start() {
    if (ranking === null) return
    setWarning(0)
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
            São {questionCount} questões. O cronômetro começa quando você clicar em <strong className="text-foreground">Iniciar {noun}</strong> e
            só para quando você conferir suas respostas e enviar. Durante a prova não é possível copiar o texto das questões.
          </p>
        </div>
      </div>

      {askRanking ? (
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="size-4 text-primary" aria-hidden="true" />
            Deseja aparecer no ranking deste {noun}?
          </legend>
          {[
            { value: true, title: "Sim, quero aparecer", hint: essay ? "Seu nome abreviado aparece com acertos e tempo. O ranking também pode incluir a nota da redação e a soma final." : "Seu primeiro nome e a inicial do sobrenome aparecem com acertos e tempo." },
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
        <Button onClick={requestStart} disabled={pending || ranking === null}>
          <Play data-icon="inline-start" />
          {pending ? "Iniciando..." : `Iniciar ${noun}`}
        </Button>
      </div>

      {essay ? (
        <>
          <AlertDialog open={warning === 1} onOpenChange={(open) => (!open ? setWarning(0) : null)}>
            <AlertDialogContent className="border-2 border-destructive">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <Timer className="size-5" aria-hidden="true" />
                  AVISO 1 de 2: O CRONÔMETRO NÃO PARA
                </AlertDialogTitle>
                <AlertDialogDescription render={<div />} className="flex flex-col gap-3 text-foreground">
                  <div className="flex gap-3 rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm leading-relaxed">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
                    <div className="flex flex-col gap-1.5">
                      <p>
                        Este simulado reproduz a sua prova: questões e redação no mesmo tempo. Depois de iniciar,{" "}
                        <strong>o cronômetro não pode ser pausado</strong>.
                      </p>
                      <p>
                        Se vai fazer a redação, <strong>baixe e imprima a folha de redação agora</strong> e separe caneta azul ou preta. A redação
                        é enviada junto com as respostas, dentro do tempo: depois do envio, não é possível mandá-la.
                      </p>
                    </div>
                  </div>
                  {essay.sheetUrl ? (
                    <a href={essay.sheetUrl} download className={buttonVariants({ variant: "outline" })}>
                      <Download data-icon="inline-start" />
                      Baixar folha de redação (PDF)
                    </a>
                  ) : null}
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={okSheet} onCheckedChange={(value) => setOkSheet(Boolean(value))} className="mt-0.5" />
                    <span>Estou pronto: folha impressa (ou não vou fazer a redação) e tempo reservado.</span>
                  </label>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Ainda não</AlertDialogCancel>
                <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={!okSheet} onClick={() => setWarning(2)}>
                  Continuar
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={warning === 2} onOpenChange={(open) => (!open ? setWarning(0) : null)}>
            <AlertDialogContent className="border-2 border-destructive">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <Camera className="size-5" aria-hidden="true" />
                  AVISO 2 de 2: FOTO DA REDAÇÃO
                </AlertDialogTitle>
                <AlertDialogDescription render={<div />} className="flex flex-col gap-3 text-foreground">
                  <div className="flex gap-3 rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm leading-relaxed">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
                    <div className="flex flex-col gap-1.5">
                      <p>
                        A foto deve mostrar a <strong>folha inteira, 100% legível</strong>, com os 4 quadrados pretos dos cantos. Letra ilegível ou foto
                        embaçada, escura ou cortada leva à <strong>ANULAÇÃO, sem recurso</strong>.
                      </p>
                      <p>
                        Não se identifique na folha. O texto digitado no campo da plataforma tem <strong>correção aproximada</strong> e pode ser impreciso.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={okPhoto} onCheckedChange={(value) => setOkPhoto(Boolean(value))} className="mt-0.5" />
                    <span>Li e entendi as regras da redação.</span>
                  </label>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={!okPhoto || pending} onClick={start}>
                  <Play data-icon="inline-start" />
                  Iniciar {noun}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  )
}
