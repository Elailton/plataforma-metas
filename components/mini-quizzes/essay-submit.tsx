"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ImagePlus, Send, ShieldAlert, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"
import { submitMiniQuizEssay } from "@/lib/mini-quizzes/essay-actions"
import { ESSAY_MAX_BODY, ESSAY_MAX_IMAGE_BYTES, ESSAY_MAX_IMAGES, essayImagePath } from "@/lib/mini-quizzes/essay.mjs"

const BUCKET = "mini-quiz-essays"
const MAX_SIDE = 2600

/** Reduz fotos muito grandes (mantendo a leitura). Se o navegador não conseguir, envia a original. */
async function prepareImage(file: File): Promise<Blob> {
  if (file.size <= 2.5 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

function Warning({ icon: Icon, children }: { icon: typeof AlertTriangle; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm leading-relaxed text-foreground">
      <Icon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

/** Envio opcional da redação: foto(s) da folha e/ou texto colado, com dois avisos antes de enviar. */
export function EssaySubmit({ attemptId, userId }: { attemptId: string; userId: string }) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [body, setBody] = useState("")
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [okLegible, setOkLegible] = useState(false)
  const [okContent, setOkContent] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  function addFiles(list: FileList | null) {
    if (!list) return
    const incoming = Array.from(list).filter((file) => file.type.startsWith("image/"))
    const next = [...files, ...incoming].slice(0, ESSAY_MAX_IMAGES)
    if (files.length + incoming.length > ESSAY_MAX_IMAGES) toast.error(`Envie no máximo ${ESSAY_MAX_IMAGES} fotos.`)
    setFiles(next)
  }

  function openWarnings() {
    if (files.length === 0 && !body.trim()) {
      toast.error("Anexe a foto da folha ou cole o texto da redação.")
      return
    }
    setOkLegible(false)
    setOkContent(false)
    setStep(1)
  }

  async function send() {
    setStep(0)
    setPending(true)
    try {
      const supabase = createClient()
      const paths: string[] = []
      for (const [index, file] of files.entries()) {
        const blob = await prepareImage(file)
        if (blob.size > ESSAY_MAX_IMAGE_BYTES) {
          toast.error(`A foto ${index + 1} passa de 10 MB. Tire outra foto ou reduza o tamanho.`)
          return
        }
        const mime = blob.type || file.type || "image/jpeg"
        const path = essayImagePath(userId, attemptId, index, crypto.randomUUID(), mime)
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false })
        if (error) {
          toast.error(`Não foi possível enviar a foto ${index + 1}. Confira a internet e tente novamente.`)
          return
        }
        paths.push(path)
      }
      const result = await submitMiniQuizEssay(attemptId, body, paths)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Redação enviada! A correção sai em até 7 dias.")
      router.refresh()
    } catch {
      toast.error("Não foi possível enviar a redação. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
      <div>
        <p className="text-sm font-semibold text-foreground">Enviar redação (opcional)</p>
        <p className="text-xs text-muted-foreground">
          Anexe até {ESSAY_MAX_IMAGES} fotos da folha e/ou cole o texto. Se não fez a redação, não precisa enviar nada: suas questões já foram corrigidas.
        </p>
      </div>

      <Warning icon={AlertTriangle}>
        <p className="font-semibold uppercase tracking-wide text-destructive">Atenção antes de fotografar</p>
        <p>
          A foto deve mostrar a <strong>folha inteira, 100% legível</strong>. Letra ilegível, foto embaçada, cortada ou escura
          leva à <strong>ANULAÇÃO</strong> da redação, <strong>sem direito a recurso</strong>.
        </p>
      </Warning>

      <div className="flex flex-col gap-2">
        <label
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground hover:bg-muted/50"
          aria-disabled={pending || files.length >= ESSAY_MAX_IMAGES}
        >
          <ImagePlus className="size-5" aria-hidden="true" />
          {files.length >= ESSAY_MAX_IMAGES ? "Limite de fotos atingido" : "Anexar foto da redação"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={pending || files.length >= ESSAY_MAX_IMAGES}
            onChange={(event) => {
              addFiles(event.target.files)
              event.target.value = ""
            }}
          />
        </label>
        {previews.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2">
            {previews.map((url, index) => (
              <li key={url} className="relative overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto ${index + 1} da redação`} className="aspect-[3/4] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  className="absolute right-1 top-1 rounded-md bg-background/90 p-1 text-destructive"
                  aria-label={`Remover foto ${index + 1}`}
                  disabled={pending}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`redacao-${attemptId}`} className="text-sm font-medium text-foreground">
          Ou cole o texto da redação
        </label>
        <Textarea
          id={`redacao-${attemptId}`}
          value={body}
          onChange={(event) => setBody(event.target.value.slice(0, ESSAY_MAX_BODY))}
          rows={8}
          placeholder="Cole aqui o texto, exatamente como escreveu na folha."
          disabled={pending}
        />
        <span className="text-right text-xs tabular-nums text-muted-foreground">
          {body.length}/{ESSAY_MAX_BODY}
        </span>
      </div>

      <Button onClick={openWarnings} disabled={pending || (files.length === 0 && !body.trim())}>
        <Send data-icon="inline-start" />
        {pending ? "Enviando..." : "Enviar redação"}
      </Button>

      <AlertDialog open={step === 1} onOpenChange={(open) => (!open ? setStep(0) : null)}>
        <AlertDialogContent className="border-2 border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" aria-hidden="true" />
              AVISO 1 de 2: LEGIBILIDADE
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="flex flex-col gap-3 text-foreground">
              <Warning icon={AlertTriangle}>
                <p>
                  A <strong>folha inteira</strong> precisa estar <strong>100% legível</strong> na foto. Letras ilegíveis, fotos
                  embaçadas, escuras ou cortadas levam à <strong>ANULAÇÃO</strong> da redação.
                </p>
                <p className="font-semibold text-destructive">A anulação NÃO é passível de recurso.</p>
              </Warning>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={okLegible} onCheckedChange={(value) => setOkLegible(Boolean(value))} className="mt-0.5" />
                <span>Conferi: a folha inteira aparece e está 100% legível.</span>
              </label>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e revisar</AlertDialogCancel>
            <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={!okLegible} onClick={() => setStep(2)}>
              Entendi, continuar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={step === 2} onOpenChange={(open) => (!open ? setStep(0) : null)}>
        <AlertDialogContent className="border-2 border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" aria-hidden="true" />
              AVISO 2 de 2: CONTEÚDO DO ANEXO
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="flex flex-col gap-3 text-foreground">
              <Warning icon={ShieldAlert}>
                <p>
                  Envie <strong>somente a sua redação</strong>. Qualquer coisa fora do âmbito da redação (outras imagens, conteúdo
                  ofensivo, dados pessoais ou mensagens) poderá causar o <strong>BANIMENTO</strong> da sua conta.
                </p>
                <p>Não escreva seu nome nem se identifique na folha. Depois de enviada, a redação não pode ser trocada.</p>
              </Warning>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={okContent} onCheckedChange={(value) => setOkContent(Boolean(value))} className="mt-0.5" />
                <span>Confirmo que o anexo contém apenas a minha redação.</span>
              </label>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e revisar</AlertDialogCancel>
            <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={!okContent || pending} onClick={send}>
              <Send data-icon="inline-start" />
              Enviar redação
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
