"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { Plus, Trash2, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel, FieldSeparator, FieldSet, FieldLegend, FieldDescription } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { getDisciplinesByCourse } from "@/lib/mock-data"
import type { Discipline } from "@/lib/types"

interface DraftItem {
  id: string
  disciplineId: string
  topicName: string
  orientation: string
  suggestedQuestions: string
}

function createEmptyItem(disciplines: Discipline[], id: string): DraftItem {
  return {
    id,
    disciplineId: disciplines[0]?.id ?? "",
    topicName: "",
    orientation: "",
    suggestedQuestions: "10",
  }
}

export function NewGoalForm({ courseId }: { courseId: string }) {
  const router = useRouter()
  const disciplines = getDisciplinesByCourse(courseId)
  const disciplineSelectItems = disciplines.map((discipline) => ({ label: discipline.name, value: discipline.id }))
  const nextItemId = useRef(1)
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [description, setDescription] = useState("")
  const [items, setItems] = useState<DraftItem[]>([createEmptyItem(disciplines, "item-0")])

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function addItem() {
    const id = `item-${nextItemId.current++}`
    setItems((prev) => [...prev, createEmptyItem(disciplines, id)])
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    toast.success("Meta criada com sucesso", {
      description: `"${title || "Nova meta"}" foi salva como rascunho.`,
    })
    router.push(`/admin/cursos/${courseId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="goal-title">Título da meta</FieldLabel>
              <Input
                id="goal-title"
                placeholder="Ex.: Direito Constitucional 3 — Direitos Fundamentais"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="goal-date">Data de liberação</FieldLabel>
              <Input id="goal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="goal-description">Descrição</FieldLabel>
              <Textarea
                id="goal-description"
                placeholder="Contexto e objetivo desta meta para o aluno."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <FieldSet>
        <div className="flex items-center justify-between">
          <FieldLegend>Itens da meta</FieldLegend>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus data-icon="inline-start" />
            Adicionar item
          </Button>
        </div>
        <FieldDescription>Cada item representa um tópico de disciplina que o aluno deve estudar.</FieldDescription>

        <div className="flex flex-col gap-4">
          {items.map((item, index) => (
            <Card key={item.id}>
              <CardContent>
                <FieldGroup>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                    {items.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        aria-label="Remover item"
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Disciplina</FieldLabel>
                      <Select
                        items={disciplineSelectItems}
                        value={item.disciplineId}
                        onValueChange={(value) => value && updateItem(item.id, { disciplineId: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {disciplines.map((discipline) => (
                              <SelectItem key={discipline.id} value={discipline.id}>
                                {discipline.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`topic-${item.id}`}>Tópico do edital</FieldLabel>
                      <Input
                        id={`topic-${item.id}`}
                        placeholder="Ex.: Direitos e garantias fundamentais"
                        value={item.topicName}
                        onChange={(e) => updateItem(item.id, { topicName: e.target.value })}
                        required
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor={`orientation-${item.id}`}>Orientação de estudo</FieldLabel>
                    <Textarea
                      id={`orientation-${item.id}`}
                      placeholder="Instruções para o aluno sobre como estudar este tópico."
                      value={item.orientation}
                      onChange={(e) => updateItem(item.id, { orientation: e.target.value })}
                      rows={2}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor={`questions-${item.id}`}>Questões sugeridas</FieldLabel>
                    <Input
                      id={`questions-${item.id}`}
                      type="number"
                      min={0}
                      className="max-w-32"
                      value={item.suggestedQuestions}
                      onChange={(e) => updateItem(item.id, { suggestedQuestions: e.target.value })}
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
          ))}
        </div>
      </FieldSet>

      <FieldSeparator />

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit">
          <Save data-icon="inline-start" />
          Salvar meta
        </Button>
      </div>
    </form>
  )
}
