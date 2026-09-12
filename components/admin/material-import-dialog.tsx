"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FileUp, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { importHotmartMaterials } from "@/lib/admin/actions/materials"
import { parseHotmartMaterialList } from "@/lib/admin/hotmart-material-import"
import type { AdminCourse, AdminSubject } from "@/lib/admin/types"

export function MaterialImportDialog({ courses, subjects }: { courses: AdminCourse[]; subjects: AdminSubject[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [courseId, setCourseId] = useState(courses.length === 1 ? courses[0].id : "")
  const [subjectId, setSubjectId] = useState("none")
  const [rawList, setRawList] = useState("")
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const parsed = useMemo(() => parseHotmartMaterialList(rawList), [rawList])
  const availableSubjects = subjects.filter((subject) => subject.courseId === courseId)
  const selectedRows = parsed.rows.filter((row) => selectedUrls.has(row.url))

  function loadList(value: string) {
    const nextParsed = parseHotmartMaterialList(value)
    setRawList(value)
    setSelectedUrls(new Set(nextParsed.rows.map((row) => row.url)))
  }

  function toggle(url: string) {
    setSelectedUrls((current) => {
      const next = new Set(current)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (file.size > 2_000_000) {
      toast.error("O arquivo deve ter no máximo 2 MB.")
      return
    }
    loadList(await file.text())
  }

  async function handleImport() {
    if (!courseId) {
      toast.error("Selecione o curso dos materiais.")
      return
    }
    if (selectedRows.length === 0) {
      toast.error("Selecione pelo menos um material.")
      return
    }

    setPending(true)
    try {
      const result = await importHotmartMaterials({
        courseId,
        subjectId: subjectId === "none" ? null : subjectId,
        materials: selectedRows,
      })
      toast.success(`${result.created} materiais importados${result.skipped ? `; ${result.skipped} duplicados ignorados` : ""}.`)
      setOpen(false)
      setRawList("")
      setSelectedUrls(new Set())
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar os materiais.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <FileUp data-icon="inline-start" />
            Importar da Hotmart
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar materiais da Hotmart</DialogTitle>
          <DialogDescription>
            Envie ou cole a lista extraída. Os links repetidos no mesmo curso serão ignorados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Curso</FieldLabel>
            <Select
              items={courses.map((course) => ({ label: course.name, value: course.id }))}
              value={courseId}
              onValueChange={(value) => {
                setCourseId(value ?? "")
                setSubjectId("none")
              }}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
              <SelectContent><SelectGroup>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Disciplina (opcional)</FieldLabel>
            <Select
              items={[{ label: "Sem disciplina", value: "none" }, ...availableSubjects.map((subject) => ({ label: subject.name, value: subject.id }))]}
              value={subjectId}
              onValueChange={(value) => setSubjectId(value ?? "none")}
              disabled={!courseId}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a disciplina" /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="none">Sem disciplina</SelectItem>
                {availableSubjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
              </SelectGroup></SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="hotmart-csv">Arquivo CSV</FieldLabel>
          <Input id="hotmart-csv" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => handleFile(event.target.files?.[0])} />
        </Field>
        <Field>
          <FieldLabel htmlFor="hotmart-list">Ou cole a lista</FieldLabel>
          <Textarea
            id="hotmart-list"
            value={rawList}
            onChange={(event) => loadList(event.target.value)}
            placeholder="ordem;tipo;titulo;duracao;url"
            rows={6}
          />
        </Field>

        {parsed.rows.length > 0 ? (
          <div className="rounded-md border border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
              <span>{parsed.rows.length} encontrados · {selectedRows.length} selecionados</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUrls(selectedRows.length === parsed.rows.length ? new Set() : new Set(parsed.rows.map((row) => row.url)))}
              >
                {selectedRows.length === parsed.rows.length ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
            </div>
            <div className="max-h-64 divide-y divide-border overflow-y-auto">
              {parsed.rows.map((row) => (
                <label key={row.url} className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40">
                  <Checkbox checked={selectedUrls.has(row.url)} onCheckedChange={() => toggle(row.url)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{row.title}</span>
                    <span className="text-xs text-muted-foreground">{row.type === "apostila" ? "Apostila" : "Videoaula"}{row.duration ? ` · ${row.duration}` : ""}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : rawList ? (
          <p className="text-sm text-destructive">Nenhuma linha válida foi encontrada. Use o CSV entregue com esta atualização.</p>
        ) : null}

        {parsed.ignoredLines > 0 ? <p className="text-xs text-muted-foreground">{parsed.ignoredLines} linhas inválidas ou repetidas foram ignoradas.</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
          <Button type="button" onClick={handleImport} disabled={pending || selectedRows.length === 0}>
            <Upload data-icon="inline-start" />
            {pending ? "Importando..." : `Importar ${selectedRows.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
