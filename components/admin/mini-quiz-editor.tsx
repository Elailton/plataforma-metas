"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, ClipboardPaste, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { saveMiniQuiz } from "@/lib/admin/actions/mini-quizzes"
import type { AdminMiniQuiz, MiniQuizStatus } from "@/lib/admin/mini-quizzes"
import { ALTERNATIVE_KEYS, parseQuestionsText, validateQuestionDraft } from "@/lib/mini-quizzes/core.mjs"
import { cn } from "@/lib/utils"

interface SubjectOption {
  id: string
  name: string
  topics: Array<{ id: string; title: string; parent_topic_id: string | null }>
}

interface DraftQuestion {
  uid: string
  id: string | null
  statement: string
  alternatives: Record<string, string>
  topicId: string
  correctKey: string
  explanation: string
}

const STATUS_LABEL: Record<MiniQuizStatus, string> = { draft: "Rascunho", published: "Publicado", archived: "Arquivado" }
const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

let counter = 0
const uid = () => `q${Date.now().toString(36)}${(counter++).toString(36)}`

function emptyQuestion(): DraftQuestion {
  return { uid: uid(), id: null, statement: "", alternatives: { A: "", B: "", C: "", D: "", E: "" }, topicId: "", correctKey: "", explanation: "" }
}

function topicOptions(subject: SubjectOption | undefined) {
  if (!subject) return []
  const parents = subject.topics.filter((topic) => !topic.parent_topic_id)
  return parents.flatMap((parent) => [
    { id: parent.id, label: parent.title },
    ...subject.topics
      .filter((topic) => topic.parent_topic_id === parent.id)
      .map((child) => ({ id: child.id, label: `${parent.title} › ${child.title}` })),
  ])
}

export function MiniQuizEditor({
  courseId,
  subjects,
  quiz,
  initialSubjectId,
}: {
  courseId: string
  subjects: SubjectOption[]
  quiz: AdminMiniQuiz | null
  initialSubjectId?: string | null
}) {
  const router = useRouter()
  const [title, setTitle] = useState(quiz?.title ?? "")
  const [description, setDescription] = useState(quiz?.description ?? "")
  const [subjectId, setSubjectId] = useState(quiz?.subjectId ?? initialSubjectId ?? subjects[0]?.id ?? "")
  const [topicId, setTopicId] = useState(quiz?.topicId ?? "")
  const [status, setStatus] = useState<MiniQuizStatus>(quiz?.status ?? "draft")
  const [position, setPosition] = useState(String(quiz?.position ?? 0))
  const [questions, setQuestions] = useState<DraftQuestion[]>(
    quiz?.questions.map((question) => ({
      uid: uid(),
      id: question.id,
      statement: question.statement,
      alternatives: Object.fromEntries(ALTERNATIVE_KEYS.map((key) => [key, question.alternatives.find((item) => item.key === key)?.text ?? ""])),
      topicId: question.topicId ?? "",
      correctKey: question.correctKey,
      explanation: question.explanation,
    })) ?? [emptyQuestion()],
  )
  const [bulkText, setBulkText] = useState("")
  const [bulkOpen, setBulkOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const subject = subjects.find((candidate) => candidate.id === subjectId)
  const topics = useMemo(() => topicOptions(subject), [subject])

  function update(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, position) => (position === index ? { ...question, ...patch } : question)))
  }

  function move(index: number, delta: number) {
    setQuestions((current) => {
      const next = [...current]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function importBulk() {
    const parsed = parseQuestionsText(bulkText)
    if (parsed.length === 0) {
      toast.error("Nenhuma questão reconhecida. Confira o formato do exemplo.")
      return
    }
    const drafts = parsed.map((item) => ({
      ...emptyQuestion(),
      statement: item.statement,
      alternatives: Object.fromEntries(ALTERNATIVE_KEYS.map((key) => [key, item.alternatives.find((alt) => alt.key === key)?.text ?? ""])),
      correctKey: item.correctKey,
      explanation: item.explanation,
    }))
    setQuestions((current) => [...current.filter((question) => question.statement.trim() || question.id), ...drafts])
    setBulkText("")
    setBulkOpen(false)
    toast.success(`${drafts.length} ${drafts.length === 1 ? "questão adicionada" : "questões adicionadas"}. Revise antes de salvar.`)
  }

  async function save() {
    for (const [index, question] of questions.entries()) {
      const problem = validateQuestionDraft({
        statement: question.statement,
        alternatives: ALTERNATIVE_KEYS.map((key) => ({ key, text: question.alternatives[key] ?? "" })).filter((item) => item.text.trim()),
        correctKey: question.correctKey,
      })
      if (problem) {
        toast.error(`Questão ${index + 1}: ${problem}`)
        document.getElementById(`questao-${question.uid}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
        return
      }
    }
    setPending(true)
    try {
      const result = await saveMiniQuiz({
        quizId: quiz?.id ?? null,
        courseId,
        subjectId,
        topicId: topicId || null,
        title,
        description,
        status,
        position: Number(position) || 0,
        expectedUpdatedAt: quiz?.updatedAt ?? null,
        questions: questions.map((question) => ({
          id: question.id,
          statement: question.statement,
          alternatives: ALTERNATIVE_KEYS.map((key) => ({ key, text: question.alternatives[key] ?? "" })),
          topicId: question.topicId || null,
          correctKey: question.correctKey,
          explanation: question.explanation,
        })),
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(status === "published" ? "Mini simulado salvo e publicado." : "Mini simulado salvo.")
      router.push(`/admin/mini-simulados/${result.quizId}?curso=${courseId}`)
      router.refresh()
    } catch {
      toast.error("Não foi possível salvar o mini simulado.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2 md:p-5">
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="quiz-title">Título</FieldLabel>
          <Input id="quiz-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Crase" />
        </Field>
        <Field>
          <FieldLabel htmlFor="quiz-subject">Disciplina</FieldLabel>
          <select
            id="quiz-subject"
            className={SELECT_CLASS}
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value)
              setTopicId("")
              setQuestions((current) => current.map((question) => ({ ...question, topicId: "" })))
            }}
            disabled={Boolean(quiz && quiz.attemptCount > 0)}
          >
            {subjects.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="quiz-topic">Assunto principal (diagnóstico)</FieldLabel>
          <select id="quiz-topic" className={SELECT_CLASS} value={topicId} onChange={(event) => setTopicId(event.target.value)}>
            <option value="">Sem assunto principal</option>
            {topics.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="quiz-status">Situação</FieldLabel>
          <select id="quiz-status" className={SELECT_CLASS} value={status} onChange={(event) => setStatus(event.target.value as MiniQuizStatus)}>
            {(Object.keys(STATUS_LABEL) as MiniQuizStatus[]).map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="quiz-position">Ordem na disciplina</FieldLabel>
          <Input id="quiz-position" type="number" value={position} onChange={(event) => setPosition(event.target.value)} />
        </Field>
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="quiz-description">Orientação ao aluno (opcional)</FieldLabel>
          <Textarea id="quiz-description" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        {quiz && quiz.attemptCount > 0 ? (
          <p className="text-xs text-muted-foreground md:col-span-2">
            Este mini simulado já tem {quiz.attemptCount} {quiz.attemptCount === 1 ? "tentativa" : "tentativas"}. Questões removidas
            ficam arquivadas e as tentativas antigas continuam no histórico e no diagnóstico.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          Questões <span className="text-muted-foreground tabular-nums">({questions.length})</span>
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen((open) => !open)}>
            <ClipboardPaste data-icon="inline-start" />
            Colar em lote
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuestions((current) => [...current, emptyQuestion()])}>
            <Plus data-icon="inline-start" />
            Nova questão
          </Button>
        </div>
      </div>

      <p className="-mt-3 text-xs text-muted-foreground">
        Use <code>**negrito**</code> e <code>__sublinhado__</code> para destaques. Imagens importadas do Word aparecem como{" "}
        <code>[[imagem:…]]</code>; mantenha a linha para que a figura continue na questão.
      </p>

      {bulkOpen ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Cole uma ou mais questões. Formato: <code>1. Enunciado</code>, uma linha por alternativa (<code>A) ...</code>),{" "}
            <code>Gabarito: C</code> e, se quiser, <code>Comentário: ...</code>.
          </p>
          <Textarea rows={10} value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder={"1. Enunciado...\nA) ...\nB) ...\nC) ...\nD) ...\nE) ...\nGabarito: C\nComentário: ..."} />
          <div className="flex justify-end">
            <Button size="sm" onClick={importBulk} disabled={!bulkText.trim()}>
              Adicionar questões
            </Button>
          </div>
        </div>
      ) : null}

      <ol className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <li key={question.uid} id={`questao-${question.uid}`} className="rounded-xl border border-border bg-card p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-primary tabular-nums">Questão {index + 1}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="Mover para cima" onClick={() => move(index, -1)} disabled={index === 0}>
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Mover para baixo" onClick={() => move(index, 1)} disabled={index === questions.length - 1}>
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remover questão"
                  onClick={() => setQuestions((current) => current.filter((_, position) => position !== index))}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Textarea rows={4} value={question.statement} onChange={(event) => update(index, { statement: event.target.value })} placeholder="Enunciado" aria-label={`Enunciado da questão ${index + 1}`} />
              <div className="flex flex-col gap-2" role="radiogroup" aria-label={`Alternativas da questão ${index + 1}`}>
                {ALTERNATIVE_KEYS.map((key) => (
                  <div key={key} className="flex items-start gap-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={question.correctKey === key}
                      aria-label={`Marcar ${key} como correta`}
                      onClick={() => update(index, { correctKey: key })}
                      className={cn(
                        "mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                        question.correctKey === key ? "border-success bg-success text-success-foreground" : "border-border text-muted-foreground hover:border-foreground",
                      )}
                    >
                      {key}
                    </button>
                    <Textarea
                      rows={1}
                      className="min-h-9"
                      value={question.alternatives[key] ?? ""}
                      onChange={(event) => update(index, { alternatives: { ...question.alternatives, [key]: event.target.value } })}
                      placeholder={key === "E" ? "Alternativa E (opcional)" : `Alternativa ${key}`}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Clique na letra para marcar a alternativa correta.</p>
              </div>
              <select
                className={SELECT_CLASS}
                value={question.topicId}
                onChange={(event) => update(index, { topicId: event.target.value })}
                aria-label={`Assunto da questão ${index + 1}`}
              >
                <option value="">Assunto: o mesmo do mini simulado</option>
                {topics.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Textarea rows={3} value={question.explanation} onChange={(event) => update(index, { explanation: event.target.value })} placeholder="Comentário da correção (aparece para o aluno depois do envio)" />
            </div>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
        <span className="text-sm text-muted-foreground">{STATUS_LABEL[status]}</span>
        <Button onClick={save} disabled={pending}>
          <Save data-icon="inline-start" />
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  )
}
