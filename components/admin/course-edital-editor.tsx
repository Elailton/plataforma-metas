"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import {
  createSubject,
  renameSubject,
  deleteSubject,
  addSyllabusTopicsBulk,
  renameSyllabusTopic,
  deleteSyllabusTopic,
} from "@/lib/admin/actions/edital"
import type { AdminSubject, AdminSyllabusTopic } from "@/lib/admin/types"

interface CourseEditalEditorProps {
  courseId: string
  groups: { subject: AdminSubject; topics: AdminSyllabusTopic[] }[]
}

export function CourseEditalEditor({ courseId, groups }: CourseEditalEditorProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <NewSubjectDialog courseId={courseId} onDone={() => router.refresh()} />
      </div>

      {groups.length > 0 ? (
        <Accordion className="rounded-xl border border-border bg-card">
          {groups.map(({ subject, topics }) => (
            <AccordionItem key={subject.id} value={subject.id} className="px-4">
              <div className="flex items-center gap-2">
                <AccordionTrigger className="flex-1">{subject.name}</AccordionTrigger>
                <span className="text-xs text-muted-foreground">
                  {topics.length} {topics.length === 1 ? "tópico" : "tópicos"}
                </span>
                <EditSubjectDialog courseId={courseId} subject={subject} onDone={() => router.refresh()} />
                <DeleteSubjectAlert courseId={courseId} subject={subject} onDone={() => router.refresh()} />
              </div>
              <AccordionContent>
                <div className="flex flex-col gap-2 pb-4">
                  {topics.map((topic) => (
                    <TopicRow key={topic.id} courseId={courseId} topic={topic} onDone={() => router.refresh()} />
                  ))}
                  <AddTopicsDialog subjectId={subject.id} courseId={courseId} onDone={() => router.refresh()} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : null}
    </div>
  )
}

function NewSubjectDialog({ courseId, onDone }: { courseId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await createSubject(courseId, name)
      toast.success("Disciplina adicionada")
      setName("")
      setOpen(false)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar a disciplina.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus data-icon="inline-start" />
            Nova disciplina
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova disciplina</DialogTitle>
          <DialogDescription>Adicione uma disciplina ao edital deste curso.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Field>
            <FieldLabel htmlFor="subject-name">Nome da disciplina</FieldLabel>
            <Input
              id="subject-name"
              placeholder="Ex.: Direito Constitucional"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditSubjectDialog({
  courseId,
  subject,
  onDone,
}: {
  courseId: string
  subject: AdminSubject
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(subject.name)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await renameSubject(subject.id, courseId, name)
      toast.success("Disciplina atualizada")
      setOpen(false)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a disciplina.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Editar disciplina" onClick={(e) => e.stopPropagation()} />
        }
      >
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar disciplina</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Field>
            <FieldLabel htmlFor={`edit-subject-${subject.id}`}>Nome da disciplina</FieldLabel>
            <Input id={`edit-subject-${subject.id}`} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteSubjectAlert({
  courseId,
  subject,
  onDone,
}: {
  courseId: string
  subject: AdminSubject
  onDone: () => void
}) {
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    setPending(true)
    try {
      await deleteSubject(subject.id, courseId)
      toast.success("Disciplina removida")
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover a disciplina.")
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remover disciplina"
            disabled={pending}
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <Trash2 className="size-3.5 text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {subject.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Todos os tópicos desta disciplina também serão removidos. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function TopicRow({
  courseId,
  topic,
  onDone,
}: {
  courseId: string
  topic: AdminSyllabusTopic
  onDone: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(topic.title)
  const [pending, setPending] = useState(false)

  async function handleSave() {
    setPending(true)
    try {
      await renameSyllabusTopic(topic.id, courseId, title)
      setEditing(false)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o tópico.")
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    setPending(true)
    try {
      await deleteSyllabusTopic(topic.id, courseId)
      toast.success("Tópico removido")
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover o tópico.")
    } finally {
      setPending(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8" autoFocus />
        <Button variant="ghost" size="icon" className="size-7" onClick={handleSave} disabled={pending} aria-label="Salvar">
          <Check className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            setEditing(false)
            setTitle(topic.title)
          }}
          disabled={pending}
          aria-label="Cancelar"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-secondary/50">
      <span className="text-sm text-foreground">{topic.title}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setEditing(true)}
          aria-label="Editar tópico"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleDelete}
          disabled={pending}
          aria-label="Remover tópico"
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

function AddTopicsDialog({
  subjectId,
  courseId,
  onDone,
}: {
  subjectId: string
  courseId: string
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [rawTopics, setRawTopics] = useState("")
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await addSyllabusTopicsBulk(subjectId, courseId, rawTopics)
      toast.success("Tópicos adicionados")
      setRawTopics("")
      setOpen(false)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar os tópicos.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="self-start">
            <Plus data-icon="inline-start" />
            Adicionar tópicos
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar tópicos</DialogTitle>
          <DialogDescription>Cole um tópico por linha para adicionar vários de uma vez.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="bulk-topics">Tópicos</FieldLabel>
              <Textarea
                id="bulk-topics"
                placeholder={"Direitos e garantias fundamentais\nOrganização do Estado\nPoder Legislativo"}
                value={rawTopics}
                onChange={(e) => setRawTopics(e.target.value)}
                rows={8}
                required
              />
              <FieldDescription>Cada linha se torna um tópico independente.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
