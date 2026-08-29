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
import { createCourse, updateCourse } from "@/lib/admin/actions/courses"
import type { AdminCourse, CourseStatus } from "@/lib/admin/types"

const STATUS_ITEMS: { label: string; value: CourseStatus }[] = [
  { label: "Rascunho", value: "draft" },
  { label: "Publicado", value: "published" },
  { label: "Arquivado", value: "archived" },
]

interface CourseFormDialogProps {
  course?: AdminCourse
  trigger?: React.ReactElement
}

export function CourseFormDialog({ course, trigger }: CourseFormDialogProps) {
  const router = useRouter()
  const isEditing = Boolean(course)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [name, setName] = useState(course?.name ?? "")
  const [organization, setOrganization] = useState(course?.organization ?? "")
  const [description, setDescription] = useState(course?.description ?? "")
  const [status, setStatus] = useState<CourseStatus>(course?.status ?? "draft")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      if (isEditing && course) {
        await updateCourse(course.id, { name, organization, description, status })
        toast.success("Curso atualizado com sucesso")
      } else {
        await createCourse({ name, organization, description, status })
        toast.success("Curso criado com sucesso", { description: `"${name}" já está disponível.` })
        setName("")
        setOrganization("")
        setDescription("")
        setStatus("draft")
      }
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o curso.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus data-icon="inline-start" />
              Novo curso
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar curso" : "Novo curso"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações deste concurso."
              : "Cadastre um novo concurso para organizar disciplinas, materiais e metas."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="course-name">Nome do curso</FieldLabel>
              <Input
                id="course-name"
                placeholder="Ex.: Polícia Rodoviária Federal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="course-organization">Instituição / órgão</FieldLabel>
              <Input
                id="course-organization"
                placeholder="Ex.: Departamento de Polícia Rodoviária Federal"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="course-description">Descrição</FieldLabel>
              <Textarea
                id="course-description"
                placeholder="Contexto sobre o concurso, banca, cargo ou vagas."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select items={STATUS_ITEMS} value={status} onValueChange={(value) => value && setStatus(value as CourseStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUS_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {isEditing ? <Pencil data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
              {isEditing ? "Salvar alterações" : "Criar curso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
