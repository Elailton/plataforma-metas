"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, FileText, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { saveMiniQuiz, uploadMiniQuizImage } from "@/lib/admin/actions/mini-quizzes"
import { parseMiniQuizDocx, titleFromFilename } from "@/lib/mini-quizzes/docx-import.mjs"
import { cn } from "@/lib/utils"

interface ParsedFile {
  name: string
  title: string
  questions: Awaited<ReturnType<typeof parseMiniQuizDocx>>["questions"]
  images: Awaited<ReturnType<typeof parseMiniQuizDocx>>["images"]
  warnings: string[]
  duplicate: boolean
  status: "ready" | "done" | "error"
  message?: string
}

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-BR")

/** Importa mini simulados de arquivos .docx no modelo de montagem (questões, gabarito e comentários). */
export function MiniQuizDocxImport({
  courseId,
  subjects,
  existingTitles,
}: {
  courseId: string
  subjects: Array<{ id: string; name: string }>
  existingTitles: Array<{ subjectId: string; title: string }>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "")
  const [status, setStatus] = useState<"draft" | "published">("draft")
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState("")

  const isDuplicate = (title: string, subject: string) =>
    existingTitles.some((item) => item.subjectId === subject && normalize(item.title) === normalize(title))

  async function readFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    setReading(true)
    const parsed: ParsedFile[] = []
    for (const file of Array.from(list)) {
      try {
        if (!/\.docx$/i.test(file.name)) throw new Error("Use arquivos .docx.")
        if (file.size > 25 * 1024 * 1024) throw new Error("Arquivo maior que 25 MB.")
        const result = await parseMiniQuizDocx(await file.arrayBuffer())
        const title = titleFromFilename(file.name)
        parsed.push({
          name: file.name,
          title,
          questions: result.questions,
          images: result.images,
          warnings: result.warnings,
          duplicate: isDuplicate(title, subjectId),
          status: "ready",
        })
      } catch (error) {
        parsed.push({
          name: file.name,
          title: titleFromFilename(file.name),
          questions: [],
          images: [],
          warnings: [error instanceof Error ? error.message : "Não foi possível ler o arquivo."],
          duplicate: false,
          status: "error",
        })
      }
    }
    parsed.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }))
    setFiles(parsed)
    setReading(false)
  }

  const importable = files.filter((file) => file.status === "ready" && file.warnings.length === 0 && !file.duplicate && file.title.trim())

  async function runImport() {
    setImporting(true)
    const uploaded = new Set<string>()
    let created = 0
    try {
      for (const [index, file] of files.entries()) {
        if (!importable.includes(file)) continue
        setProgress(`Importando ${created + 1} de ${importable.length}: ${file.title}`)
        let failed: string | null = null
        for (const image of file.images) {
          if (uploaded.has(image.hash)) continue
          const result = await uploadMiniQuizImage({ hash: image.hash, mime: image.mime, base64: image.base64 })
          if (!result.ok) {
            failed = result.error
            break
          }
          uploaded.add(image.hash)
        }
        const result = failed
          ? { ok: false as const, error: failed }
          : await saveMiniQuiz({
              quizId: null,
              courseId,
              subjectId,
              topicId: null,
              title: file.title,
              description: "",
              status,
              position: index,
              expectedUpdatedAt: null,
              questions: file.questions.map((question) => ({
                id: null,
                statement: question.statement,
                alternatives: question.alternatives,
                topicId: null,
                correctKey: question.correctKey,
                explanation: question.explanation,
              })),
            })
        setFiles((current) =>
          current.map((item) =>
            item.name === file.name
              ? { ...item, status: result.ok ? "done" : "error", message: result.ok ? undefined : result.error }
              : item,
          ),
        )
        if (result.ok) created += 1
      }
      toast.success(`${created} ${created === 1 ? "mini simulado importado" : "mini simulados importados"}.`)
      router.refresh()
    } catch {
      toast.error("A importação foi interrompida. Os arquivos já importados continuam salvos.")
    } finally {
      setImporting(false)
      setProgress("")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (importing) return
        setOpen(next)
        if (!next) setFiles([])
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <Upload data-icon="inline-start" />
            Importar do Word
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar mini simulados do Word</DialogTitle>
          <DialogDescription>
            Cada .docx vira um mini simulado: questões numeradas (01., 02. …), alternativas A) a E) e a tabela final de
            gabarito e comentários. Negrito, sublinhado e imagens são mantidos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="import-subject">Disciplina</FieldLabel>
            <select
              id="import-subject"
              className={SELECT_CLASS}
              value={subjectId}
              disabled={importing}
              onChange={(event) => {
                const next = event.target.value
                setSubjectId(next)
                setFiles((current) => current.map((file) => ({ ...file, duplicate: isDuplicate(file.title, next) })))
              }}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="import-status">Situação após importar</FieldLabel>
            <select
              id="import-status"
              className={SELECT_CLASS}
              value={status}
              disabled={importing}
              onChange={(event) => setStatus(event.target.value as "draft" | "published")}
            >
              <option value="draft">Rascunho (revisar antes de publicar)</option>
              <option value="published">Publicado</option>
            </select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="import-files">Arquivos .docx</FieldLabel>
          <Input
            id="import-files"
            type="file"
            multiple
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={importing || reading}
            onChange={(event) => readFiles(event.target.files)}
          />
        </Field>

        {reading ? <p className="text-sm text-muted-foreground">Lendo arquivos…</p> : null}

        {files.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {files.map((file) => (
              <li key={file.name} className="flex flex-col gap-2 p-3">
                <div className="flex items-start gap-2">
                  {file.status === "done" ? (
                    <CheckCircle2 className="mt-2 size-4 shrink-0 text-success" aria-label="Importado" />
                  ) : file.status === "error" || file.warnings.length || file.duplicate ? (
                    <AlertTriangle className="mt-2 size-4 shrink-0 text-destructive" aria-label="Atenção" />
                  ) : (
                    <FileText className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Input
                      value={file.title}
                      aria-label={`Título de ${file.name}`}
                      disabled={importing || file.status === "done"}
                      onChange={(event) => {
                        const title = event.target.value
                        setFiles((current) =>
                          current.map((item) =>
                            item.name === file.name ? { ...item, title, duplicate: isDuplicate(title, subjectId) } : item,
                          ),
                        )
                      }}
                    />
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {file.name} · {file.questions.length} questões
                      {file.images.length ? ` · ${file.images.length} ${file.images.length === 1 ? "imagem" : "imagens"}` : ""}
                    </p>
                  </div>
                </div>
                {file.duplicate ? (
                  <p className="text-xs text-destructive">Já existe um mini simulado com este título nesta disciplina.</p>
                ) : null}
                {[...file.warnings, ...(file.message ? [file.message] : [])].map((warning) => (
                  <p key={warning} className={cn("text-xs", file.status === "done" ? "text-muted-foreground" : "text-destructive")}>
                    {warning}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        ) : null}

        {progress ? <p className="text-sm text-muted-foreground">{progress}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
            Fechar
          </Button>
          <Button onClick={runImport} disabled={importing || importable.length === 0}>
            <Upload data-icon="inline-start" />
            {importing ? "Importando…" : `Importar ${importable.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
