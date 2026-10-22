import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock, HelpCircle, Layers, ListChecks, Pencil } from "lucide-react"
import { PageHeader, SectionHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { GoalItemChecklist } from "@/components/student/goal-item-checklist"
import { getAdminCourse, listCourseEdital, listCourseGoals, listMaterials } from "@/lib/admin/queries"
import { formatDate, formatDateLong } from "@/lib/format"
import { cn } from "@/lib/utils"
import { isGoalReleased } from "@/lib/goals/release.mjs"
import { formatMinutes, goalsForPreview, parsePreviewGroup, summarizeGoal } from "@/lib/goals/preview.mjs"
import type { AdminGoal } from "@/lib/admin/types"
import type { StudentGoalItem } from "@/lib/student/types"

export default async function AdminGoalPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ grupo?: string | string[]; meta?: string | string[] }>
}) {
  const [{ courseId }, query] = await Promise.all([params, searchParams])
  const course = await getAdminCourse(courseId)
  if (!course) notFound()

  const [goals, edital, materials] = await Promise.all([
    listCourseGoals(course.id),
    listCourseEdital(course.id),
    listMaterials(course.id),
  ])

  const group = course.groupsEnabled ? (parsePreviewGroup(query.grupo) ?? 1) : null
  const list = goalsForPreview(goals, group)
  const requestedId = Array.isArray(query.meta) ? query.meta[0] : query.meta
  // Sem meta escolhida, abre a última já liberada (ou a primeira, se nenhuma foi liberada).
  const firstLocked = list.findIndex((goal) => !isGoalReleased(goal.dueDate))
  const defaultIndex = firstLocked === -1 ? list.length - 1 : Math.max(0, firstLocked - 1)
  const requestedIndex = requestedId ? list.findIndex((goal) => goal.id === requestedId) : -1
  const selectedIndex = requestedIndex >= 0 ? requestedIndex : Math.max(0, defaultIndex)
  const selected = list[selectedIndex]

  const subjectNames = new Map(edital.map((entry) => [entry.subject.id, entry.subject.name]))
  const topicNames = new Map(edital.flatMap((entry) => entry.topics.map((topic) => [topic.id, topic.title] as const)))
  const topicImportance = new Map(edital.flatMap((entry) => entry.topics.map((topic) => [topic.id, topic.importance] as const)))
  const materialById = new Map(materials.map((material) => [material.id, material]))

  const href = (params: { grupo?: number | null; meta?: string }) => {
    const search = new URLSearchParams()
    if (params.grupo) search.set("grupo", String(params.grupo))
    if (params.meta) search.set("meta", params.meta)
    const qs = search.toString()
    return `/admin/cursos/${course.id}/previa${qs ? `?${qs}` : ""}`
  }

  const toStudentItems = (goal: AdminGoal): StudentGoalItem[] =>
    goal.items.map((item) => ({
      id: item.id,
      subjectId: item.subjectId,
      subjectName: subjectNames.get(item.subjectId) ?? "Disciplina",
      topicId: item.topicId,
      topicName: item.topicId ? (topicNames.get(item.topicId) ?? null) : null,
      subtopicId: item.subtopicId,
      subtopicName: item.subtopicId ? (topicNames.get(item.subtopicId) ?? null) : null,
      importance: (item.subtopicId ? topicImportance.get(item.subtopicId) : null) ?? (item.topicId ? topicImportance.get(item.topicId) : null) ?? null,
      instructions: item.instructions,
      suggestedQuestions: item.suggestedQuestions,
      materials: item.materialIds
        .map((id) => materialById.get(id))
        .filter((material) => material !== undefined)
        .map((material) => ({ id: material.id, title: material.title, type: material.type, url: material.url })),
      completed: false,
    }))

  const groupTabs = course.groupsEnabled ? (
    <div className="flex rounded-lg border border-border bg-card p-0.5" role="tablist" aria-label="Grupo da prévia">
      {[1, 2, 3].map((option) => (
        <Link
          key={option}
          href={href({ grupo: option })}
          role="tab"
          aria-selected={group === option}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            group === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option === 3 ? "Grupo 3 · teste" : `Grupo ${option}`}
        </Link>
      ))}
    </div>
  ) : null

  return (
    <>
      <PageHeader
        backHref={`/admin/cursos/${course.id}`}
        backLabel={course.name}
        title="Prévia das metas"
        description="Veja cada meta exatamente como o aluno vê, com tempo estimado e questões, antes da liberação. Nada é salvo nesta tela."
        actions={groupTabs}
      />

      {!selected ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ListChecks /></EmptyMedia>
            <EmptyTitle>Nenhuma meta para mostrar</EmptyTitle>
            <EmptyDescription>Crie ou publique metas{group ? ` para o Grupo ${group}` : ""} para vê-las aqui.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <nav aria-label="Metas" className="order-2 lg:order-1">
            <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:sticky lg:top-20">
              <div className="border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {list.length} {list.length === 1 ? "meta" : "metas"}{group ? ` · Grupo ${group}` : ""}
              </div>
              <ol className="flex max-h-[70vh] flex-col divide-y divide-border overflow-y-auto">
                {list.map((goal) => {
                  const summary = summarizeGoal(goal)
                  const active = goal.id === selected.id
                  return (
                    <li key={goal.id}>
                      <Link
                        href={href({ grupo: group, meta: goal.id })}
                        scroll={false}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex flex-col gap-1 px-4 py-2.5 transition-colors",
                          active ? "bg-primary/10" : "hover:bg-secondary/50",
                        )}
                      >
                        <span className={cn("line-clamp-2 text-sm font-medium", active ? "text-foreground" : "text-foreground/90")}>
                          {goal.title}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span>{goal.dueDate ? formatDate(goal.dueDate) : "Sem data"}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{formatMinutes(summary.minutes)}</span>
                          {goal.status === "draft" ? <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">Rascunho</Badge> : null}
                          {isGoalReleased(goal.dueDate) && goal.status === "published" ? (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">Liberada</Badge>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ol>
            </div>
          </nav>

          <GoalPreview
            goal={selected}
            items={toStudentItems(selected)}
            group={group}
            editHref={`/admin/cursos/${course.id}/metas/${selected.id}`}
            prevHref={selectedIndex > 0 ? href({ grupo: group, meta: list[selectedIndex - 1].id }) : null}
            nextHref={selectedIndex < list.length - 1 ? href({ grupo: group, meta: list[selectedIndex + 1].id }) : null}
            position={`${selectedIndex + 1} de ${list.length}`}
          />
        </div>
      )}
    </>
  )
}

function GoalPreview({
  goal,
  items,
  group,
  editHref,
  prevHref,
  nextHref,
  position,
}: {
  goal: AdminGoal
  items: StudentGoalItem[]
  group: number | null
  editHref: string
  prevHref: string | null
  nextHref: string | null
  position: string
}) {
  const summary = summarizeGoal(goal)
  const released = isGoalReleased(goal.dueDate)

  return (
    <div className="order-1 flex min-w-0 flex-col gap-5 lg:order-2">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" disabled={!prevHref} render={prevHref ? <Link href={prevHref} scroll={false} /> : undefined} nativeButton={!prevHref}>
          <ChevronLeft data-icon="inline-start" />
          Anterior
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">{position}</span>
        <Button variant="outline" size="sm" disabled={!nextHref} render={nextHref ? <Link href={nextHref} scroll={false} /> : undefined} nativeButton={!nextHref}>
          Próxima
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>

      <section aria-label="Conferência do administrador" className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Conferência{group ? ` · Grupo ${group}` : ""}
          </span>
          <Button variant="ghost" size="sm" render={<Link href={editHref} />} nativeButton={false}>
            <Pencil data-icon="inline-start" />
            Editar meta
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Clock} label="Tempo estimado" value={formatMinutes(summary.minutes)} />
          <Stat icon={HelpCircle} label="Questões" value={String(summary.questions)} />
          <Stat icon={ListChecks} label="Itens" value={String(summary.items)} />
          <Stat icon={Layers} label="Disciplinas" value={String(summary.subjects)} />
        </dl>
        {summary.itemsWithoutTime > 0 ? (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-primary" />
            {summary.itemsWithoutTime} {summary.itemsWithoutTime === 1 ? "item não informa" : "itens não informam"} o tempo na orientação
            (ex.: “~30 min”) e {summary.itemsWithoutTime === 1 ? "ficou" : "ficaram"} fora da estimativa.
          </p>
        ) : null}
        {goal.status !== "published" ? (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Esta meta está como {goal.status === "draft" ? "rascunho" : "arquivada"} e não aparece para os alunos.
          </p>
        ) : null}
      </section>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Como o aluno vê</span>
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground">{goal.title}</h2>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" />
            {goal.dueDate ? `${released ? "Liberada em" : "Libera em"} ${formatDateLong(goal.dueDate)}` : "Disponível imediatamente"}
          </span>
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">0</span> de{" "}
            <span className="tabular-nums">{items.length}</span> {items.length === 1 ? "item" : "itens"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={0} className="h-2 flex-1" aria-label="Progresso da meta: 0%" />
          <span className="w-10 text-right text-sm font-semibold tabular-nums text-foreground">0%</span>
        </div>
        {goal.description ? (
          <p className="whitespace-pre-line border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">{goal.description}</p>
        ) : null}
      </div>

      <section aria-labelledby="itens-previa">
        <SectionHeader title={<span id="itens-previa">Itens da meta</span>} />
        <div className="flex flex-col gap-3 md:gap-4">
          {items.map((item) => (
            <GoalItemChecklist key={item.id} item={item} preview />
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-card px-3 py-2">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-lg font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}
