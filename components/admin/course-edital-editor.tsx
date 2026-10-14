"use client"

import { useMemo, useState } from "react"
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
  setSyllabusTopicImportance,
} from "@/lib/admin/actions/edital"
import type { AdminSubject, AdminSyllabusTopic } from "@/lib/admin/types"
import { SearchInput } from "@/components/search-input"
import { matchesSearch, searchTerms } from "@/lib/search.mjs"

interface CourseEditalEditorProps {
  courseId: string
  groups: { subject: AdminSubject; topics: AdminSyllabusTopic[] }[]
}

function topicDisplayTitle(title: string) {
  return title.replace(/^\d+(?:\.\d+)*[\s.)-]+/, "").trim() || title
}

export function CourseEditalEditor({ courseId, groups }: CourseEditalEditorProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [openItems, setOpenItems] = useState<string[]>([])
  const searching = searchTerms(query).length > 0

  const visibleGroups = useMemo(() => {
    return groups.flatMap(({ subject, topics }) => {
      const rootTopics = topics
        .filter((topic) => !topic.parentTopicId)
        .map((topic, index) => ({ topic, number: `${index + 1}` }))
      if (!searching || matchesSearch(query, [subject.name])) {
        return [{ subject, topics, rootTopics }]
      }
      const childrenOf = new Map<string, AdminSyllabusTopic[]>()
      for (const topic of topics) {
        if (!topic.parentTopicId) continue
        const siblings = childrenOf.get(topic.parentTopicId) ?? []
        siblings.push(topic)
        childrenOf.set(topic.parentTopicId, siblings)
      }
      const branchMatches = (topic: AdminSyllabusTopic): boolean =>
        matchesSearch(query, [topic.title]) ||
        (childrenOf.get(topic.id) ?? []).some(branchMatches)
      const matchingRoots = rootTopics.filter(({ topic }) => branchMatches(topic))
      return matchingRoots.length > 0
        ? [{ subject, topics, rootTopics: matchingRoots }]
        : []
    })
  }, [groups, query, searching])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {groups.length > 0 ? (
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Pesquisar disciplina ou tópico"
            label="Pesquisar no edital"
            className="sm:max-w-md"
          />
        ) : <span />}
        <NewSubjectDialog courseId={courseId} onDone={() => router.refresh()} />
      </div>

      {groups.length > 0 && visibleGroups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma disciplina ou tópico encontrado para “{query.trim()}”.
        </p>
      ) : null}

      {visibleGroups.length > 0 ? (
        <Accordion
          className="rounded-xl border border-border bg-card"
          multiple={searching}
          value={searching ? visibleGroups.map(({ subject }) => subject.id) : openItems}
          onValueChange={(value) => {
            if (!searching) setOpenItems(value as string[])
          }}
        >
          {visibleGroups.map(({ subject, topics, rootTopics }) => {
            return (
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
                    {rootTopics.map(({ topic, number }) => (
                      <TopicRow
                        key={topic.id}
                        courseId={courseId}
                        subjectId={subject.id}
                        topic={topic}
                        number={number}
                        subtopics={topics.filter((subtopic) => subtopic.parentTopicId === topic.id)}
                        onDone={() => router.refresh()}
                        allTopics={topics}
                      />
                    ))}
                    <AddTopicsDialog subjectId={subject.id} courseId={courseId} onDone={() => router.refresh()} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
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
  subjectId,
  topic,
  number,
  subtopics = [],
  onDone,
  isSubtopic = false,
  allTopics = [],
}: {
  courseId: string
  subjectId: string
  topic: AdminSyllabusTopic
  number: string
  subtopics?: AdminSyllabusTopic[]
  onDone: () => void
  isSubtopic?: boolean
  allTopics?: AdminSyllabusTopic[]
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

  async function handleImportance(value: string) {
    setPending(true)
    try {
      const result = await setSyllabusTopicImportance(topic.id, courseId, value === "" ? null : value)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a importância.")
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
      <div className={`flex items-center gap-2 rounded-lg border border-border px-3 py-2 ${isSubtopic ? "ml-6" : ""}`}>
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
    <div className="flex flex-col gap-1">
      <div className={`group flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-secondary/50 ${isSubtopic ? "ml-6 border-l border-border/70" : ""}`}>
        <span className={`text-sm ${isSubtopic ? "text-muted-foreground" : "text-foreground"}`}>
          <span className="mr-2 font-mono text-xs text-muted-foreground">{number}</span>
          {topicDisplayTitle(topic.title)}
        </span>
        <div className="flex items-center gap-1">
          <select
            value={topic.importance ?? ""}
            onChange={(event) => handleImportance(event.target.value)}
            disabled={pending}
            aria-label="Importância do tópico"
            className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs text-muted-foreground"
          >
            <option value="">Sem selo</option>
            <option value="high">Alta importância</option>
            <option value="medium">Importante</option>
            <option value="low">Baixa importância</option>
          </select>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          {!isSubtopic ? (
            <AddTopicsDialog
              subjectId={subjectId}
              courseId={courseId}
              parentTopicId={topic.id}
              triggerLabel="Subtópicos"
              onDone={onDone}
            />
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setEditing(true)}
            aria-label={isSubtopic ? "Editar subtópico" : "Editar tópico"}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleDelete}
            disabled={pending}
            aria-label={isSubtopic ? "Remover subtópico" : "Remover tópico"}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      {subtopics.length > 0 ? (
        <div className="flex flex-col gap-1">
          {subtopics.map((subtopic, index) => {
            const subtopicSubtopics = allTopics.filter((t) => t.parentTopicId === subtopic.id)
            return (
              <TopicRow
                key={subtopic.id}
                courseId={courseId}
                subjectId={subjectId}
                topic={subtopic}
                number={`${number}.${index + 1}`}
                subtopics={subtopicSubtopics}
                onDone={onDone}
                isSubtopic
                allTopics={allTopics}
              />
            )
          })}
        </div>
      ) : null}
      {!isSubtopic && subtopics.length === 0 ? (
        <div className="ml-9 text-xs text-muted-foreground/70">Sem subtópicos</div>
      ) : null}
    </div>
  )
}

function AddTopicsDialog({
  subjectId,
  courseId,
  parentTopicId = null,
  triggerLabel = "Adicionar tópicos",
  onDone,
}: {
  subjectId: string
  courseId: string
  parentTopicId?: string | null
  triggerLabel?: string
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [rawTopics, setRawTopics] = useState("")
  const [pending, setPending] = useState(false)

  const isSubtopic = Boolean(parentTopicId)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      const result = await addSyllabusTopicsBulk(subjectId, courseId, rawTopics, parentTopicId)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(isSubtopic ? "Subtópicos adicionados" : "Tópicos adicionados")
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
          <Button variant="outline" size="sm" className={isSubtopic ? "h-7 px-2 text-xs" : "self-start"}>
            <Plus data-icon="inline-start" />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSubtopic ? "Adicionar subtópicos" : "Adicionar tópicos"}</DialogTitle>
          <DialogDescription>
            {isSubtopic
              ? "Cole um subtópico por linha para criar a hierarquia abaixo deste tópico."
              : "Cole um tópico por linha para adicionar vários de uma vez."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={isSubtopic ? "bulk-subtopics" : "bulk-topics"}>
                {isSubtopic ? "Subtópicos" : "Tópicos"}
              </FieldLabel>
              <Textarea
                id={isSubtopic ? "bulk-subtopics" : "bulk-topics"}
                placeholder={
                  isSubtopic
                    ? "Interpretação de textos\nTipologia textual\nGêneros textuais"
                    : "Direitos e garantias fundamentais\nOrganização do Estado\nPoder Legislativo"
                }
                value={rawTopics}
                onChange={(e) => setRawTopics(e.target.value)}
                rows={8}
                required
              />
              <FieldDescription>
                Cada linha se torna {isSubtopic ? "um subtópico vinculado ao tópico principal." : "um tópico independente."}
              </FieldDescription>
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
