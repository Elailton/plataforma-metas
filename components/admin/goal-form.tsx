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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { MaterialFormDialog } from "@/components/admin/material-form-dialog"
import {
  MaterialTypeIcon,
  materialTypeLabel,
} from "@/components/admin/material-type-icon"
import {
  createGoal,
  updateGoal,
  type GoalFormInput,
  type GoalItemInput,
} from "@/lib/admin/actions/goals"
import { filterBySearch } from "@/lib/search.mjs"
import type {
  AdminGoal,
  AdminMaterial,
  AdminSubject,
  AdminSyllabusTopic,
  GoalStatus,
} from "@/lib/admin/types"

interface DraftItem {
  id?: string
  key: string
  subjectId: string
  topicId: string
  subtopicId: string
  instructions: string
  suggestedQuestions: string
  materialIds: string[]
}

function emptyItem(key: string, subjects: AdminSubject[]): DraftItem {
  return {
    key,
    subjectId: subjects[0]?.id ?? "",
    topicId: "",
    subtopicId: "",
    instructions: "",
    suggestedQuestions: "10",
    materialIds: [],
  }
}

function goalToDrafts(goal: AdminGoal): DraftItem[] {
  return goal.items.map((item, index) => ({
    key: `existing-${item.id}-${index}`,
    id: item.id,
    subjectId: item.subjectId,
    topicId: item.topicId ?? "",
    subtopicId: item.subtopicId ?? "",
    instructions: item.instructions ?? "",
    suggestedQuestions:
      item.suggestedQuestions != null ? String(item.suggestedQuestions) : "",
    materialIds: item.materialIds,
  }))
}

function topicDisplayTitle(title: string) {
  return title.replace(/^\d+(?:\.\d+)*[\s.)-]+/, "").trim() || title
}

interface GoalFormProps {
  courseId: string
  subjects: AdminSubject[]
  topicsBySubject: Record<string, AdminSyllabusTopic[]>
  materials: AdminMaterial[]
  goal?: AdminGoal
}

export function GoalForm({
  courseId,
  subjects,
  topicsBySubject,
  materials,
  goal,
}: GoalFormProps) {
  const router = useRouter()
  const isEditing = Boolean(goal)
  const nextKey = useRef(1)

  const [targetGroups, setTargetGroups] = useState<number[]>(
    goal?.targetGroups ?? [1, 2],
  )
  const [title, setTitle] = useState(goal?.title ?? "")
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? "")
  const [description, setDescription] = useState(goal?.description ?? "")
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "draft")
  const [items, setItems] = useState<DraftItem[]>(
    goal ? goalToDrafts(goal) : [emptyItem("item-0", subjects)],
  )
  const [goalMaterials, setGoalMaterials] = useState<AdminMaterial[]>(materials)
  const [materialSearchByItem, setMaterialSearchByItem] = useState<
    Record<string, string>
  >({})
  const [pending, setPending] = useState(false)

  const subjectSelectItems = subjects.map((s) => ({
    label: s.name,
    value: s.id,
  }))

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )
  }

  function addItem() {
    const key = `item-${nextKey.current++}`
    setItems((prev) => [...prev, emptyItem(key, subjects)])
  }

  function removeItem(key: string) {
    setItems((prev) =>
      prev.length > 1 ? prev.filter((item) => item.key !== key) : prev,
    )
  }

  function toggleMaterial(key: string, materialId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item
        const has = item.materialIds.includes(materialId)
        return {
          ...item,
          materialIds: has
            ? item.materialIds.filter((id) => id !== materialId)
            : [...item.materialIds, materialId],
        }
      }),
    )
  }

  function updateMaterialSearch(key: string, value: string) {
    setMaterialSearchByItem((prev) => ({ ...prev, [key]: value }))
  }

  function handleMaterialCreated(key: string, material: AdminMaterial) {
    setGoalMaterials((prev) =>
      prev.some((item) => item.id === material.id) ? prev : [material, ...prev],
    )
    setItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              materialIds: item.materialIds.includes(material.id)
                ? item.materialIds
                : [...item.materialIds, material.id],
            }
          : item,
      ),
    )
    updateMaterialSearch(key, "")
  }

  async function handleSubmit(
    event: React.FormEvent,
    submitStatus?: GoalStatus,
  ) {
    event.preventDefault()
    setPending(true)
    try {
      const goalItems: GoalItemInput[] = items.map((item) => ({
        id: item.id,
        subjectId: item.subjectId,
        topicId: item.topicId || null,
        subtopicId: item.subtopicId || null,
        instructions: item.instructions,
        suggestedQuestions: item.suggestedQuestions.trim()
          ? Number(item.suggestedQuestions)
          : null,
        materialIds: item.materialIds,
      }))

      const input: GoalFormInput = {
        courseId,
        title,
        description,
        dueDate: dueDate || null,
        status: submitStatus ?? (isEditing && goal ? goal.status : status),
        targetGroups,
        updatedAt: goal?.updatedAt,
        items: goalItems,
      }

      if (isEditing && goal) {
        await updateGoal(goal.id, input)
        toast.success("Meta atualizada com sucesso")
      } else {
        await createGoal(input)
        toast.success("Meta criada com sucesso", {
          description: `"${title}" foi salva.`,
        })
      }
      router.push(`/admin/cursos/${courseId}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a meta.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {isEditing && (
        <p className="text-sm text-muted-foreground">
          Editar textos, materiais ou a ordem mantém as conclusões. Remover um
          item ou trocar sua disciplina/tópico arquiva o item anterior; o
          histórico é preservado e um novo tópico começa sem conclusão.
        </p>
      )}
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
                <FieldLabel htmlFor="goal-date">
                  Data de liberação (opcional)
                </FieldLabel>
                <Input
                  id="goal-date"
                  type="date"
                  value={dueDate ?? ""}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <FieldDescription>
                  {dueDate
                    ? "Até esta data, a meta ficará visível ao aluno, mas bloqueada para alterações."
                    : "Disponível imediatamente."}
                </FieldDescription>
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
                    onValueChange={(value) =>
                      value && setStatus(value as GoalStatus)
                    }
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
              <FieldLabel>Grupos que recebem esta meta</FieldLabel>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[1, 2, 3].map((group) => (
                  <label
                    key={group}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={targetGroups.includes(group)}
                      onChange={(event) =>
                        setTargetGroups((prev) =>
                          event.target.checked
                            ? [...prev, group]
                            : prev.filter((g) => g !== group),
                        )
                      }
                    />
                    {group === 3 ? "Grupo 3 (teste)" : `Grupo ${group}`}
                  </label>
                ))}
              </div>
              <FieldDescription>
                Para testar antes, marque só o Grupo 3 (sua conta de teste) e
                depois libere para os Grupos 1 e 2. Em cursos com divisão ativa,
                alunos sem grupo não recebem metas.
              </FieldDescription>
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
        <FieldDescription>
          Cada item representa um tópico de disciplina que o aluno deve estudar.
        </FieldDescription>

        <div className="flex flex-col gap-4">
          {items.map((item, index) => {
            const topics = topicsBySubject[item.subjectId] ?? []
            const rootTopics = topics.filter((topic) => !topic.parentTopicId)
            const subtopics = item.topicId
              ? topics.filter((topic) => topic.parentTopicId === item.topicId)
              : []
            const materialSearch = materialSearchByItem[item.key] ?? ""
            const scopedMaterials = goalMaterials.filter(
              (m) => !m.subjectId || m.subjectId === item.subjectId,
            )
            const availableMaterials = filterBySearch(
              scopedMaterials,
              materialSearch,
              (material) => [
                material.title,
                materialTypeLabel(material.type),
                material.description,
              ],
            )

            return (
              <Card key={item.key}>
                <CardContent>
                  <FieldGroup>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Item {index + 1}
                      </span>
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
                          onValueChange={(value) =>
                            value &&
                            updateItem(item.key, {
                              subjectId: value,
                              topicId: "",
                              subtopicId: "",
                            })
                          }
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
                          items={rootTopics.map((t, topicIndex) => ({
                            label: `${topicIndex + 1}. ${topicDisplayTitle(t.title)}`,
                            value: t.id,
                          }))}
                          value={item.topicId}
                          onValueChange={(value) =>
                            updateItem(item.key, {
                              topicId: value ?? "",
                              subtopicId: "",
                            })
                          }
                          disabled={rootTopics.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                rootTopics.length === 0
                                  ? "Sem tópicos cadastrados"
                                  : "Selecione o tópico"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {rootTopics.map((topic, topicIndex) => (
                                <SelectItem key={topic.id} value={topic.id}>
                                  {topicIndex + 1}.{" "}
                                  {topicDisplayTitle(topic.title)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel>Subtópico do edital (opcional)</FieldLabel>
                        <Select
                          items={subtopics.map((t, subtopicIndex) => ({
                            label: `${rootTopics.findIndex((topic) => topic.id === item.topicId) + 1}.${subtopicIndex + 1} ${topicDisplayTitle(t.title)}`,
                            value: t.id,
                          }))}
                          value={item.subtopicId || "none"}
                          onValueChange={(value) =>
                            updateItem(item.key, {
                              subtopicId: value === "none" ? "" : (value ?? ""),
                            })
                          }
                          disabled={subtopics.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                subtopics.length === 0
                                  ? "Sem subtópicos para este tópico"
                                  : "Selecione o subtópico"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="none">
                                Sem subtópico
                              </SelectItem>
                              {subtopics.map((topic, subtopicIndex) => (
                                <SelectItem key={topic.id} value={topic.id}>
                                  {rootTopics.findIndex(
                                    (rootTopic) =>
                                      rootTopic.id === item.topicId,
                                  ) + 1}
                                  .{subtopicIndex + 1}{" "}
                                  {topicDisplayTitle(topic.title)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldDescription>
                          Você pode vincular a meta somente ao tópico principal,
                          se preferir.
                        </FieldDescription>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor={`orientation-${item.key}`}>
                        Orientação de estudo
                      </FieldLabel>
                      <Textarea
                        id={`orientation-${item.key}`}
                        placeholder="Instruções para o aluno sobre como estudar este tópico."
                        value={item.instructions}
                        onChange={(e) =>
                          updateItem(item.key, { instructions: e.target.value })
                        }
                        rows={2}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor={`questions-${item.key}`}>
                        Questões sugeridas
                      </FieldLabel>
                      <Input
                        id={`questions-${item.key}`}
                        type="number"
                        min={0}
                        className="max-w-32"
                        value={item.suggestedQuestions}
                        onChange={(e) =>
                          updateItem(item.key, {
                            suggestedQuestions: e.target.value,
                          })
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Materiais vinculados</FieldLabel>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            aria-label="Pesquisar materiais"
                            placeholder="Pesquisar materiais"
                            value={materialSearchByItem[item.key] ?? ""}
                            onChange={(event) =>
                              updateMaterialSearch(item.key, event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.preventDefault()
                            }}
                          />
                          <MaterialFormDialog
                            fixedCourseId={courseId}
                            initialSubjectId={item.subjectId || null}
                            subjects={subjects}
                            onCreated={(material) =>
                              handleMaterialCreated(item.key, material)
                            }
                            trigger={
                              <Button
                                type="button"
                                variant="outline"
                                className="shrink-0"
                              >
                                <Plus data-icon="inline-start" />
                                Criar novo material
                              </Button>
                            }
                          />
                        </div>
                        {availableMaterials.length === 0 ? (
                          <FieldDescription>
                            {scopedMaterials.length === 0
                              ? "Nenhum material disponível para esta disciplina. Crie um novo material sem sair da meta."
                              : "Nenhum material encontrado com essa busca."}
                          </FieldDescription>
                        ) : (
                          <div className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
                            {availableMaterials.map((material) => {
                              const checked = item.materialIds.includes(
                                material.id,
                              )
                              return (
                                <label
                                  key={material.id}
                                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-secondary/50"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() =>
                                      toggleMaterial(item.key, material.id)
                                    }
                                  />
                                  <MaterialTypeIcon type={material.type} />
                                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                                    {material.title}
                                  </span>
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    {materialTypeLabel(material.type)}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
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
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
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
