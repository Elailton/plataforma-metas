"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, ImagePlus, Keyboard, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { ESSAY_MAX_BODY, ESSAY_MAX_IMAGES, essayDraftKey } from "@/lib/mini-quizzes/essay.mjs"

const MAX_SIDE = 2600

/** Reduz fotos muito grandes (mantendo a leitura). Se o navegador não conseguir, envia a original. */
export async function prepareEssayImage(file: File): Promise<Blob> {
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

/**
 * Redação dentro da prova (no tempo do cronômetro): foto(s) da folha e/ou texto digitado.
 * Tudo é enviado junto com as respostas; o texto fica salvo neste navegador enquanto a prova está aberta.
 */
export function EssayInExam({
  quizId,
  files,
  onFilesChange,
  text,
  onTextChange,
  disabled = false,
}: {
  quizId: string
  files: File[]
  onFilesChange: (files: File[]) => void
  text: string
  onTextChange: (text: string) => void
  disabled?: boolean
}) {
  const key = essayDraftKey(quizId)
  const [previews, setPreviews] = useState<string[]>([])
  const [saved, setSaved] = useState(true)
  const timer = useRef<number | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    try {
      const draft = window.localStorage.getItem(key)
      if (draft) onTextChange(draft.slice(0, ESSAY_MAX_BODY))
    } catch {
      // Sem armazenamento no navegador: o campo funciona, mas não guarda o rascunho.
    }
  }, [key, onTextChange])

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  function changeText(value: string) {
    const next = value.slice(0, ESSAY_MAX_BODY)
    onTextChange(next)
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

  function addFiles(list: FileList | null) {
    if (!list) return
    const incoming = Array.from(list).filter((file) => file.type.startsWith("image/"))
    if (files.length + incoming.length > ESSAY_MAX_IMAGES) toast.error(`Anexe no máximo ${ESSAY_MAX_IMAGES} fotos.`)
    onFilesChange([...files, ...incoming].slice(0, ESSAY_MAX_IMAGES))
  }

  return (
    <section aria-labelledby="redacao-envio" className="flex flex-col gap-4 rounded-xl border-2 border-primary/60 bg-card p-4 md:p-5">
      <div>
        <h2 id="redacao-envio" className="text-base font-semibold text-foreground">
          Sua redação <span className="font-normal text-muted-foreground">(opcional)</span>
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Anexe a foto da folha, digite o texto abaixo, faça os dois ou deixe em branco. A redação é enviada{" "}
          <strong className="text-foreground">junto com as respostas</strong>, no botão Enviar respostas, dentro do tempo da prova.{" "}
          <strong className="text-foreground">Depois do envio, não é possível mandar a redação.</strong>
        </p>
      </div>

      <div className="flex gap-3 rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-xs leading-relaxed text-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <p>
          A foto deve mostrar a <strong>folha inteira, 100% legível</strong>, com os 4 quadrados pretos dos cantos. Letra ilegível ou foto
          embaçada, escura ou cortada leva à <strong>ANULAÇÃO</strong>, sem direito a recurso. Não se identifique na folha.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground hover:bg-muted/50"
          aria-disabled={disabled || files.length >= ESSAY_MAX_IMAGES}
        >
          <ImagePlus className="size-5" aria-hidden="true" />
          {files.length >= ESSAY_MAX_IMAGES ? "Limite de fotos atingido" : "Anexar foto da folha de redação"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={disabled || files.length >= ESSAY_MAX_IMAGES}
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
                  onClick={() => onFilesChange(files.filter((_, i) => i !== index))}
                  className="absolute right-1 top-1 rounded-md bg-background/90 p-1 text-destructive"
                  aria-label={`Remover foto ${index + 1}`}
                  disabled={disabled}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {files.length > 0 ? (
          <p className="text-xs text-muted-foreground">Se você recarregar a página, anexe as fotos de novo (o texto digitado fica salvo).</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`redacao-${quizId}`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Keyboard className="size-4 text-primary" aria-hidden="true" />
          Digite a sua redação aqui
        </label>
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Atenção:</strong> a correção feita só pelo texto digitado é <strong className="text-foreground">aproximada</strong>
          {" "}(não avalia letra, margens e número de linhas) e pode ser imprecisa. Para a correção mais fiel, anexe também a foto da folha.
        </p>
        <Textarea
          id={`redacao-${quizId}`}
          value={text}
          onChange={(event) => changeText(event.target.value)}
          rows={14}
          placeholder="Escreva aqui a sua redação."
          className="select-text"
          disabled={disabled}
        />
        <span className="text-right text-xs text-muted-foreground">{text ? (saved ? "Rascunho salvo neste aparelho" : "Salvando...") : ""}</span>
      </div>
    </section>
  )
}
