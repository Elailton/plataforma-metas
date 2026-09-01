"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createMaterial, updateMaterial } from "@/lib/admin/actions/materials"
import type { AdminMaterial, AdminMaterialType, AdminSubject } from "@/lib/admin/types"

const TYPE_ITEMS: { label: string; value: AdminMaterialType }[] = [
  { label: "Videoaula", value: "videoaula" },
  { label: "Apostila", value: "apostila" },
  { label: "Link", value: "link" },
]

interface CourseOption {
  id: string
  name: string
}

interface MaterialFormDialogProps {
  material?: AdminMaterial
  trigger?: React.ReactElement
  /** Curso fixo — quando usado dentro da página do curso, não permite trocar. */
  fixedCourseId?: string
  courses?: CourseOption[]
  subjects?: AdminSubject[]
}

export function MaterialFormDialog({
  material,
  trigger,
  fixedCourseId,
  courses = [],
  subjects = [],
}: MaterialFormDialogProps) {
  const router = useRouter()
  const isEditing = Boolean(material)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [title, setTitle] = useState(material?.title ?? "")
  const [type, setType] = useState<AdminMaterialType>(material?.type ?? "videoaula")
  const [url, setUrl] = useState(material?.url ?? "")
  const [description, setDescription] = useState(material?.description ?? "")
  const [courseId, setCourseId] = useState<string>(material?.courseId ?? fixedCourseId ?? "none")
  const [subjectId, setSubjectId] = useState<string>(material?.subjectId ?? "none")

  const courseSelectItems = [{ label: "Nenhum (biblioteca geral)", value: "none" }, ...courses.map((c) => ({ label: c.name, value: c.id }))]
  const subjectSelectItems = [{ label: "Nenhuma", value: "none" }, ...subjects.map((s) => ({ label: s.name, value: s.id }))]

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      const input = {
        title,
        type,
        url,
        description,
        courseId: courseId === "none" ? null : courseId,
        subjectId: subjectId === "none" ? null : subjectId,
      }
      if (isEditing && material) {
        await updateMaterial(material.id, input)
        toast.success("Material atualizado com sucesso")
      } else {
        await createMaterial(input)
        toast.success("Material adicionado com sucesso")
        setTitle("")
        setType("videoaula")
        setUrl("")
        setDescription("")
        setCourseId(fixedCourseId ?? "none")
        setSubjectId("none")
      }
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o material.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              <Plus data-icon="inline-start" />
              Novo material
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar material" : "Novo material"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize as informações deste material." : "Adicione uma videoaula, apostila ou link de apoio."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="material-title">Título</FieldLabel>
              <Input
                id="material-title"
                placeholder="Ex.: Aula 01 — Direitos Fundamentais"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select items={TYPE_ITEMS} value={type} onValueChange={(value) => value && setType(value as AdminMaterialType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TYPE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="material-url">URL</FieldLabel>
                <Input
                  id="material-url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </Field>
            </div>
            {!fixedCourseId ? (
              <Field>
                <FieldLabel>Curso</FieldLabel>
                <Select
                  items={courseSelectItems}
                  value={courseId}
                  onValueChange={(value) => {
                    setCourseId(value ?? "none")
                    setSubjectId("none")
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o curso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {courseSelectItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            {subjects.length > 0 ? (
              <Field>
                <FieldLabel>Disciplina (opcional)</FieldLabel>
                <Select items={subjectSelectItems} value={subjectId} onValueChange={(value) => setSubjectId(value ?? "none")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {subjectSelectItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="material-description">Descrição (opcional)</FieldLabel>
              <Textarea
                id="material-description"
                placeholder="Contexto adicional sobre este material."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {isEditing ? <Pencil data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
              {isEditing ? "Salvar alterações" : "Adicionar material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
