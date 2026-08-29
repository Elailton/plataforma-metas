"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { MaterialTypeIcon, materialTypeLabel } from "@/components/admin/material-type-icon"
import { createGoal, updateGoal, type GoalFormInput, type GoalItemInput } from "@/lib/admin/actions/goals"
import type { AdminGoal, AdminMaterial, AdminSubject, AdminSyllabusTopic, GoalStatus } from "@/lib/admin/types"

interface DraftItem {
  key: string
  subjectId: string
  topicId: string
  instructions: string
  suggestedQuestions: string
  materialIds: string[]
}

function emptyItem(key: string, subjects: AdminSubject[]): DraftItem {
  return {
    key,
    subjectId: subjects[0]?.id ?? "",
    topicId: "",
    instructions: "",
    suggestedQuestions: "10",
    materialIds: [],
  }
}

function goalToDrafts(goal: AdminGoal): DraftItem[] {
  return goal.items.map((item, index) => ({
    key: `existing-${item.id}-${index}`,
    subjectId: item.subjectId,
    topicId: item.topicId ?? "",
    instructions: item.instructions ?? "",
    suggestedQuestions: item.suggestedQuestions != null ? String(item.suggestedQuestions) : "",
    materialIds: item.materialIds,
  }))
}

interface GoalFormProps {
  courseId: string
  subjects: AdminSubject[]
  topicsBySubject: Record<string, AdminSyllabusTopic[]>
  materials: AdminMaterial[]
  goal?: AdminGoal
}

export function GoalForm({ courseId, subjects, topicsBySubject, materials, goal }: GoalFormProps) {
  const router = useRouter()
  const isEditing = Boolean(goal)
  const nextKey = useRef(1)

  const [title, setTitle] = useState(goal?.title ?? "")
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? "")
  const [description, setDescription] = useState(goal?.description ?? "")
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "draft")
  const [items, setItems] = useState<DraftItem[]>(
    goal ? goalToDrafts(goal) : [emptyItem("item-0", subjects)],
  )
  const [pending, setPending] = useState(false)

  const subjectSelectItems = subjects.map((s) => ({ label: s.name, value: s.id }))

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function addItem() {
    const key = `item-${nextKey.current++}`
    setItems((prev) => [...prev, emptyItem(key, subjects)])
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev))
  }

  function toggleMaterial(key: string, materialId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item
        const has = item.materialIds.includes(materialId)
        return {
          ...item,
          materialIds: has ? item.materialIds.filter((id) => id !== materialId) : [...item.materialIds, materialId],
        }
      }),
    )
  }

  async function handleSubmit(event: React.FormEvent, submitStatus?: GoalStatus) {
    event.preventDefault()
    setPending(true)
    try {
      const goalItems: GoalItemInput[] = items.map((item) => ({
        subjectId: item.subjectId,
        topicId: item.topicId || null,
        instructions: item.instructions,
        suggestedQuestions: item.suggestedQuestions.trim() ? Number(item.suggestedQuestions) : null,
        materialIds: item.materialIds,
      }))

      const input: GoalFormInput = {
        courseId,
        title,
        description,
        dueDate: dueDate || null,
        status: submitStatus ?? (isEditing && goal ? goal.status : status),
        items: goalItems,
      }

      if (isEditing && goal) {
        await updateGoal(goal.id, input)
        toast.success("Meta atualizada com sucesso")
      } else {
        await createGoal(input)
        toast.success("Meta criada com sucesso", { description: `"${title}" foi salva.` })
      }
      router.push(`/admin/cursos/${courseId}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a meta.")
    } finally {
      setPending(false)
    }
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="goal-date">Data de liberação (opcional)</FieldLabel>
                <Input id="goal-date" type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
              {!isEditing ? (
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    items={[
                      { label: "Rascunho", value: "draft" },
                      { label: "Publicada", value: "published" },
                    ]}
                    value={status}
                    onValueChange={(value) => value && setStatus(value as GoalStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="published">Publicada</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </div>
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
          {items.map((item, index) => {
            const topics = topicsBySubject[item.subjectId] ?? []
            const availableMaterials = materials.filter((m) => !m.subjectId || m.subjectId === item.subjectId)

            return (
              <Card key={item.key}>
                <CardContent>
                  <FieldGroup>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                      {items.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.key)}
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
                          items={subjectSelectItems}
                          value={item.subjectId}
                          onValueChange={(value) => value && updateItem(item.key, { subjectId: value, topicId: "" })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione a disciplina" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel>Tópico do edital</FieldLabel>
                        <Select
                          items={topics.map((t) => ({ label: t.title, value: t.id }))}
                          value={item.topicId}
                          onValueChange={(value) => updateItem(item.key, { topicId: value ?? "" })}
                          disabled={topics.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={topics.length === 0 ? "Sem tópicos cadastrados" : "Selecione o tópico"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {topics.map((topic) => (
                                <SelectItem key={topic.id} value={topic.id}>
                                  {topic.title}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor={`orientation-${item.key}`}>Orientação de estudo</FieldLabel>
                      <Textarea
                        id={`orientation-${item.key}`}
                        placeholder="Instruções para o aluno sobre como estudar este tópico."
                        value={item.instructions}
                        onChange={(e) => updateItem(item.key, { instructions: e.target.value })}
                        rows={2}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor={`questions-${item.key}`}>Questões sugeridas</FieldLabel>
                      <Input
                        id={`questions-${item.key}`}
                        type="number"
                        min={0}
                        className="max-w-32"
                        value={item.suggestedQuestions}
                        onChange={(e) => updateItem(item.key, { suggestedQuestions: e.target.value })}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Materiais vinculados</FieldLabel>
                      {availableMaterials.length === 0 ? (
                        <FieldDescription>
                          Nenhum material disponível para esta disciplina. Adicione materiais na aba Materiais do curso.
                        </FieldDescription>
                      ) : (
                        <div className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
                          {availableMaterials.map((material) => {
                            const checked = item.materialIds.includes(material.id)
                            return (
                              <label
                                key={material.id}
                                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-secondary/50"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleMaterial(item.key, material.id)}
                                />
                                <MaterialTypeIcon type={material.type} />
                                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{material.title}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {materialTypeLabel(material.type)}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </FieldSet>

      <FieldSeparator />

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          <Save data-icon="inline-start" />
          {isEditing ? "Salvar alterações" : "Salvar meta"}
        </Button>
      </div>
    </form>
  )
}
