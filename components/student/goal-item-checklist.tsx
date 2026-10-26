"use client"

import { useState, useTransition } from "react"
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  ExternalLink,
  FileText,
  HelpCircle,
  PlayCircle,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { setGoalItemCompleted } from "@/lib/student/actions"
import { cn } from "@/lib/utils"
import type { StudentGoalItem, StudentMaterial } from "@/lib/student/types"

const DESCRIPTION_TRUNCATE_THRESHOLD = 160
const MATERIALS_PREVIEW_COUNT = 3

const materialIcon: Record<StudentMaterial["type"], typeof FileText> = {
  apostila: FileText,
  videoaula: PlayCircle,
  link: ExternalLink,
}

const materialGroupLabel: Record<"apostila" | "videoaula", string> = {
  apostila: "Apostilas",
  videoaula: "Videoaulas",
}

export function GoalItemChecklist({
  item,
  locked = false,
  preview = false,
}: {
  item: StudentGoalItem
  locked?: boolean
  /** Prévia do administrador: mesma aparência do aluno, sem salvar progresso. */
  preview?: boolean
}) {
  const [isComplete, setIsComplete] = useState(item.completed)
  const [pending, startTransition] = useTransition()
  const [descExpanded, setDescExpanded] = useState(false)
  const [materialsExpanded, setMaterialsExpanded] = useState(false)

  function toggle(completed: boolean) {
    if (locked || preview) return
    const previous = isComplete
    setIsComplete(completed)
    startTransition(async () => {
      try {
        await setGoalItemCompleted(item.id, completed)
      } catch (error) {
        setIsComplete(previous)
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar seu progresso.")
      }
    })
  }

  const studyMaterials = item.materials.filter(
    (material): material is StudentMaterial & { type: "apostila" | "videoaula" } =>
      material.type === "apostila" || material.type === "videoaula",
  )
  const questionLinks = item.materials.filter((material) => material.type === "link")
  const hasLongDescription = (item.instructions?.length ?? 0) > DESCRIPTION_TRUNCATE_THRESHOLD
  const visibleMaterials = materialsExpanded ? studyMaterials : studyMaterials.slice(0, MATERIALS_PREVIEW_COUNT)
  const groupedMaterials = groupMaterialsByType(visibleMaterials)
  const hasQuestions = questionLinks.length > 0 || Boolean(item.suggestedQuestions)

  return (
    <div
      className={cn(
        "flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-4 transition-colors md:p-5",
        isComplete && !locked ? "border-success/25" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {item.subjectName}
        </span>
        {locked ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Bloqueada</span>
        ) : isComplete ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
            <CheckCircle2 className="size-3.5" />
            Concluído
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <Circle className="size-3.5" />
            Pendente
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold leading-snug text-foreground">
          {item.subtopicName ?? item.topicName ?? "Item de estudo"}
        </h3>
        {item.subtopicName && item.topicName ? (
          <span className="text-xs text-muted-foreground">{item.topicName}</span>
        ) : null}
      </div>

      {item.importance ? <ImportanceBadges importance={item.importance} /> : null}

      {item.instructions ? (
        <div className="flex flex-col gap-1.5 rounded-lg border-l-2 border-primary/60 bg-muted/30 py-2 pl-3 pr-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Orientação</span>
          <p className={cn("whitespace-pre-line text-sm leading-relaxed text-foreground/85 [overflow-wrap:anywhere]", !descExpanded && "line-clamp-3")}>
            {item.instructions}
          </p>
          {hasLongDescription ? (
            <button
              type="button"
              onClick={() => setDescExpanded((value) => !value)}
              className="self-start text-xs font-medium text-foreground underline-offset-2 transition-colors hover:underline"
            >
              {descExpanded ? "Recolher" : "Ver orientação completa"}
            </button>
          ) : null}
        </div>
      ) : null}

      {studyMaterials.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Materiais</span>
          <div className="flex flex-col overflow-hidden rounded-lg border border-border/70 bg-muted/30">
            {groupedMaterials.map((group) => (
              <div key={group.type} className="flex flex-col">
                {group.showLabel ? (
                  <span className="px-3 pt-2 text-xs font-medium text-muted-foreground">
                    {materialGroupLabel[group.type]}
                  </span>
                ) : null}
                <div className="flex flex-col divide-y divide-border/50">
                  {group.materials.map((material) => (
                    <MaterialRow key={material.id} material={material} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {studyMaterials.length > MATERIALS_PREVIEW_COUNT ? (
            <button
              type="button"
              onClick={() => setMaterialsExpanded((value) => !value)}
              className="self-start text-xs font-medium text-foreground underline-offset-2 transition-colors hover:underline"
            >
              {materialsExpanded ? "Mostrar menos" : `Ver todos os ${studyMaterials.length} materiais`}
            </button>
          ) : null}
        </div>
      ) : null}

      {hasQuestions ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Questões</span>
          <div className="flex flex-col divide-y divide-border/50 overflow-hidden rounded-lg border border-border/70 bg-muted/30">
            {questionLinks.map((material) => (
              <a
                key={material.id}
                href={material.url}
                target="_blank"
                rel="noreferrer"
                className="group flex min-h-11 items-center gap-2.5 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/60"
              >
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{material.title}</span>
                <span className="shrink-0 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  Resolver questões
                </span>
              </a>
            ))}
            {item.suggestedQuestions ? (
              <div className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground">
                <HelpCircle className="size-4 shrink-0" />
                <span>{item.suggestedQuestions} questões sugeridas</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <label
        className={cn(
          "-mx-4 -mb-4 flex min-h-12 items-center gap-3 border-t border-border px-4 py-3 text-sm font-medium text-foreground transition-colors md:-mx-5 md:-mb-5 md:px-5",
          locked || preview ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer hover:bg-secondary/40",
          isComplete && !locked && "bg-success/5",
        )}
      >
        <Checkbox
          checked={isComplete}
          disabled={pending || locked || preview}
          onCheckedChange={(checked) => toggle(checked === true)}
          className="size-5"
        />
        <span className={isComplete ? "text-muted-foreground line-through" : ""}>
          {preview
            ? "Marcar item como concluído (prévia, não salva)"
            : locked
              ? "Disponível na data de liberação"
              : isComplete
                ? "Item concluído"
                : "Marcar item como concluído"}
        </span>
      </label>
    </div>
  )
}

const importanceLabel: Record<NonNullable<StudentGoalItem["importance"]>, { label: string; className: string }> = {
  high: { label: "Alta importância", className: "bg-success/15 text-success-foreground dark:text-success" },
  medium: { label: "Importante", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  low: { label: "Baixa importância", className: "bg-muted text-muted-foreground" },
}

function ImportanceBadges({ importance }: { importance: NonNullable<StudentGoalItem["importance"]> }) {
  const { label, className } = importanceLabel[importance]
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", className)}>
        {label}
      </span>
      {importance === "high" ? (
        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
          Muito cobrado
        </span>
      ) : null}
    </div>
  )
}

function MaterialRow({ material }: { material: StudentMaterial }) {
  const Icon = materialIcon[material.type]
  return (
    <a
      href={material.url}
      target="_blank"
      rel="noreferrer"
      className="group flex min-h-11 items-center gap-2.5 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/60"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{material.title}</span>
      <ChevronDown className="size-3.5 shrink-0 -rotate-90 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  )
}

function groupMaterialsByType(materials: (StudentMaterial & { type: "apostila" | "videoaula" })[]) {
  const hasBoth = materials.some((m) => m.type === "apostila") && materials.some((m) => m.type === "videoaula")
  const order: ("apostila" | "videoaula")[] = ["apostila", "videoaula"]
  return order
    .map((type) => ({
      type,
      showLabel: hasBoth,
      materials: materials.filter((material) => material.type === type),
    }))
    .filter((group) => group.materials.length > 0)
}
