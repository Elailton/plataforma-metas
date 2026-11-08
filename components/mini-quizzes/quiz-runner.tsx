"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Send, ShieldAlert, Timer } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { submitMiniQuiz } from "@/lib/mini-quizzes/actions"
import { submitMiniQuizEssay } from "@/lib/mini-quizzes/essay-actions"
import { createClient } from "@/lib/supabase/client"
import type { QuizQuestion } from "@/lib/mini-quizzes/queries"
import { cn } from "@/lib/utils"
import { formatDateTime } from "./format"
import { RichText } from "./rich-text"
import { QuestionStatement } from "./question-statement"
import { elapsedSeconds, formatClock } from "@/lib/mini-quizzes/core.mjs"
import { ESSAY_MAX_IMAGE_BYTES, essayDraftKey, essayImagePath, remainingSeconds } from "@/lib/mini-quizzes/essay.mjs"
import { EssayPrompt } from "./essay-prompt"
import { EssayInExam, prepareEssayImage } from "./essay-in-exam"

/**
 * Resolução com cronômetro (início registrado pelo banco). As respostas só saem do navegador no envio.
 * Com tempo de prova definido (simulado geral), o cronômetro é regressivo, como na prova real.
 */
export function QuizRunner({
  quizId,
  questions,
  startedAt,
  timeLimitMinutes = null,
  essayPrompt = null,
  userId = null,
}: {
  quizId: string
  questions: QuizQuestion[]
  startedAt: string | null
  timeLimitMinutes?: number | null
  essayPrompt?: string | null
  /** Necessário para enviar as fotos da redação (pasta do próprio aluno). */
  userId?: string | null
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [essayFiles, setEssayFiles] = useState<File[]>([])
  const [essayText, setEssayText] = useState("")
  const [essayStep, setEssayStep] = useState<0 | 1 | 2>(0)
  const [okLegible, setOkLegible] = useState(false)
  const [okContent, setOkContent] = useState(false)
  const hasEssay = Boolean(essayPrompt) && (essayFiles.length > 0 || essayText.trim().length > 0)
  const answered = useMemo(() => questions.filter((question) => answers[question.id]).length, [answers, questions])
  const unanswered = questions.length - answered
  const [elapsed, setElapsed] = useState(() => (startedAt ? elapsedSeconds(startedAt) : 0))
  const remaining = remainingSeconds(timeLimitMinutes, elapsed)
  const timeOver = remaining !== null && remaining <= 0

  useEffect(() => {
    if (!startedAt || submitted) return
    const tick = () => setElapsed(elapsedSeconds(startedAt))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt, submitted])

  useEffect(() => {
    if (answered === 0 || submitted) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [answered, submitted])

  function requestSend() {
    if (hasEssay) {
      setOkLegible(false)
      setOkContent(false)
      setEssayStep(1)
      return
    }
    // Com redação disponível e nada anexado, ou com questões em branco: confirmação antes de enviar.
    if (essayPrompt || unanswered > 0) setConfirmOpen(true)
    else void send()
  }

  async function send() {
    setConfirmOpen(false)
    setEssayStep(0)
    setPending(true)
    try {
      // 1) Fotos da redação sobem antes, ainda no tempo da prova (se falhar, nada é enviado).
      const paths: string[] = []
      if (essayPrompt && essayFiles.length > 0) {
        if (!userId) {
          toast.error("Não foi possível anexar as fotos. Recarregue a página e tente novamente.")
          return
        }
        const supabase = createClient()
        for (const [index, file] of essayFiles.entries()) {
          const blob = await prepareEssayImage(file)
          if (blob.size > ESSAY_MAX_IMAGE_BYTES) {
            toast.error(`A foto ${index + 1} passa de 10 MB. Tire outra foto e anexe de novo.`)
            return
          }
          const mime = blob.type || file.type || "image/jpeg"
          const path = essayImagePath(userId, quizId, index, crypto.randomUUID(), mime)
          const { error } = await supabase.storage.from("mini-quiz-essays").upload(path, blob, { contentType: mime, upsert: false })
          if (error) {
            toast.error(`Não foi possível enviar a foto ${index + 1}. Confira a internet e tente de novo: nada foi enviado ainda.`)
            return
          }
          paths.push(path)
        }
      }

      // 2) Respostas.
      const result = await submitMiniQuiz(quizId, answers)
      if (!result.ok) {
        toast.error(result.nextAvailableAt ? `${result.error} Liberado em ${formatDateTime(result.nextAvailableAt)}.` : result.error)
        return
      }
      setSubmitted(true)

      // 3) Redação, ligada à tentativa (o banco só aceita logo após o envio das respostas).
      if (essayPrompt && (paths.length > 0 || essayText.trim())) {
        let essay = await submitMiniQuizEssay(result.attemptId, essayText, paths)
        if (!essay.ok) essay = await submitMiniQuizEssay(result.attemptId, essayText, paths)
        if (essay.ok) {
          try {
            window.localStorage.removeItem(essayDraftKey(quizId))
          } catch {
            // ignora
          }
        } else {
          toast.error(`Suas respostas foram enviadas, mas a redação não: ${essay.error} Fale com o suporte.`, { duration: 15000 })
        }
      }
      router.push(`/aluno/diagnostico-semanal/tentativas/${result.attemptId}`)
    } catch {
      toast.error("Não foi possível enviar. Confira a internet e tente novamente.")
    } finally {
      setPending(false)
    }
  }

  // Durante a prova o texto não pode ser copiado nem selecionado: só clicar nas alternativas.
  useEffect(() => {
    if (submitted) return
    // O campo da redação continua livre para digitar, selecionar e colar.
    const inEditable = (event: Event) => (event.target as Element | null)?.closest?.("textarea") != null
    const block = (event: Event) => {
      if (!inEditable(event)) event.preventDefault()
    }
    const keys = (event: KeyboardEvent) => {
      if (inEditable(event)) return
      if ((event.ctrlKey || event.metaKey) && ["c", "x", "a", "p", "s", "u"].includes(event.key.toLowerCase())) event.preventDefault()
    }
    for (const type of ["copy", "cut", "contextmenu", "dragstart", "selectstart"]) document.addEventListener(type, block)
    document.addEventListener("keydown", keys)
    return () => {
      for (const type of ["copy", "cut", "contextmenu", "dragstart", "selectstart"]) document.removeEventListener(type, block)
      document.removeEventListener("keydown", keys)
    }
  }, [submitted])

  return (
    <div className="flex select-none flex-col gap-5 [-webkit-touch-callout:none]" onCopy={(event) => {
        if (!(event.target as Element | null)?.closest?.("textarea")) event.preventDefault()
      }}>
      <ol className="flex flex-col gap-5">
        {questions.map((question, index) => (
          <li key={question.id} className="rounded-xl border border-border bg-card p-4 md:p-5">
            <fieldset className="min-w-0">
              <legend className="mb-3 flex w-full min-w-0 gap-2 text-sm leading-relaxed text-foreground">
                <span className="shrink-0 font-semibold tabular-nums text-primary">{String(index + 1).padStart(2, "0")}.</span>
                <QuestionStatement statement={question.statement} className="min-w-0 flex-1" />
              </legend>
              <div className="flex flex-col gap-2">
                {question.alternatives.map((alternative) => {
                  const checked = answers[question.id] === alternative.key
                  return (
                    <label
                      key={alternative.key}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm leading-relaxed transition-colors",
                        checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${question.id}`}
                        value={alternative.key}
                        checked={checked}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: alternative.key }))}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                        )}
                      >
                        {alternative.key}
                      </span>
                      <RichText text={alternative.text} className="min-w-0 flex-1 pt-0.5" />
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      {essayPrompt ? (
        <>
          <EssayPrompt prompt={essayPrompt} />
          <EssayInExam
            quizId={quizId}
            files={essayFiles}
            onFilesChange={setEssayFiles}
            text={essayText}
            onTextChange={setEssayText}
            disabled={pending}
          />
        </>
      ) : null}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur md:bottom-4">
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground tabular-nums">
          {startedAt && remaining !== null ? (
            <span
              className={cn("inline-flex items-center gap-1.5 font-semibold", timeOver ? "text-destructive" : "text-foreground")}
              aria-label={timeOver ? "Tempo de prova esgotado" : `Tempo restante ${formatClock(remaining)}`}
            >
              <Timer className={cn("size-4", timeOver ? "text-destructive" : "text-primary")} aria-hidden="true" />
              <span role="timer">{timeOver ? `Tempo esgotado +${formatClock(-remaining)}` : `Restam ${formatClock(remaining)}`}</span>
            </span>
          ) : startedAt ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground" aria-label={`Tempo de prova ${formatClock(elapsed)}`}>
              <Timer className="size-4 text-primary" aria-hidden="true" />
              <span role="timer">{formatClock(elapsed)}</span>
            </span>
          ) : null}
          <span>
            {answered} de {questions.length} respondidas
          </span>
        </span>
        <Button onClick={requestSend} disabled={pending || answered === 0}>
          <Send data-icon="inline-start" />
          {pending ? "Enviando..." : "Enviar respostas"}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{essayPrompt ? "Enviar sem redação?" : "Enviar com questões em branco?"}</AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="flex flex-col gap-2">
              {essayPrompt ? (
                <p>
                  Você não anexou foto nem digitou a redação. <strong className="text-foreground">Depois de enviar, não é possível mandar a redação.</strong>
                </p>
              ) : null}
              {unanswered > 0 ? (
                <p>{unanswered === 1 ? "1 questão está sem resposta" : `${unanswered} questões estão sem resposta`} e contará como erro.</p>
              ) : null}
              <p>Ao enviar, o cronômetro para e não é possível refazer.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar à prova</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Enviar mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={essayStep === 1} onOpenChange={(open) => (!open ? setEssayStep(0) : null)}>
        <AlertDialogContent className="border-2 border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" aria-hidden="true" />
              AVISO 1 de 2: LEGIBILIDADE
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="flex flex-col gap-3 text-foreground">
              <div className="flex gap-3 rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm leading-relaxed">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
                <div className="flex flex-col gap-1.5">
                  <p>
                    A <strong>folha inteira</strong> precisa estar <strong>100% legível</strong> na foto. Letras ilegíveis, fotos embaçadas, escuras
                    ou cortadas levam à <strong>ANULAÇÃO</strong> da redação.
                  </p>
                  <p className="font-semibold text-destructive">A anulação NÃO é passível de recurso.</p>
                  {essayFiles.length === 0 ? <p>Você vai enviar só o texto digitado: a correção será aproximada e pode ser imprecisa.</p> : null}
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={okLegible} onCheckedChange={(value) => setOkLegible(Boolean(value))} className="mt-0.5" />
                <span>Conferi a minha redação e quero enviar assim.</span>
              </label>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e revisar</AlertDialogCancel>
            <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={!okLegible} onClick={() => setEssayStep(2)}>
              Entendi, continuar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={essayStep === 2} onOpenChange={(open) => (!open ? setEssayStep(0) : null)}>
        <AlertDialogContent className="border-2 border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" aria-hidden="true" />
              AVISO 2 de 2: CONTEÚDO E ENVIO FINAL
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="flex flex-col gap-3 text-foreground">
              <div className="flex gap-3 rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm leading-relaxed">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
                <div className="flex flex-col gap-1.5">
                  <p>
                    Envie <strong>somente a sua redação</strong>. Qualquer coisa fora do âmbito da redação (outras imagens, conteúdo ofensivo, dados
                    pessoais ou mensagens) poderá causar o <strong>BANIMENTO</strong> da sua conta.
                  </p>
                  <p>
                    As respostas e a redação vão juntas agora e o cronômetro para. Depois disso, não é possível trocar a redação nem refazer a prova.
                  </p>
                  {unanswered > 0 ? (
                    <p>{unanswered === 1 ? "1 questão está sem resposta" : `${unanswered} questões estão sem resposta`} e contará como erro.</p>
                  ) : null}
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={okContent} onCheckedChange={(value) => setOkContent(Boolean(value))} className="mt-0.5" />
                <span>Confirmo que o anexo contém apenas a minha redação.</span>
              </label>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar à prova</AlertDialogCancel>
            <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={!okContent || pending} onClick={send}>
              <Send data-icon="inline-start" />
              Enviar respostas e redação
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
