"use client"

import { useState } from "react"
import { PlayCircle, FileText, HelpCircle, CheckCircle2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { getDiscipline, getTopic } from "@/lib/mock-data"
import type { ChecklistKey, GoalItem } from "@/lib/types"

const checklistLabels: Record<ChecklistKey, string> = {
  studied: "Estudei o tópico",
  watchedLesson: "Assisti à videoaula",
  consultedMaterial: "Consultei o material de apoio",
  solvedQuestions: "Resolvi as questões sugeridas",
}

export function GoalItemChecklist({ item }: { item: GoalItem }) {
  const [checklist, setChecklist] = useState(item.checklist)
  const discipline = getDiscipline(item.disciplineId)
  const topic = getTopic(item.topicId)

  const checkedCount = Object.values(checklist).filter(Boolean).length
  const total = Object.values(checklist).length
  const isComplete = checkedCount === total

  function toggle(key: ChecklistKey) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-primary">{discipline?.name}</span>
          <h3 className="text-sm font-semibold leading-snug text-foreground">{topic?.name}</h3>
        </div>
        {isComplete ? (
          <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-medium text-success">
            <CheckCircle2 className="size-3.5" />
            Concluído
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {checkedCount}/{total}
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{item.orientation}</p>

      <div className="flex flex-wrap gap-2">
        {item.lessonUrl ? (
          <Button render={<a href={item.lessonUrl} />} nativeButton={false} size="sm" variant="outline">
            <PlayCircle data-icon="inline-start" />
            Videoaula
          </Button>
        ) : null}
        {item.materialUrl ? (
          <Button render={<a href={item.materialUrl} />} nativeButton={false} size="sm" variant="outline">
            <FileText data-icon="inline-start" />
            Material de apoio
          </Button>
        ) : null}
        <Button size="sm" variant="outline" disabled>
          <HelpCircle data-icon="inline-start" />
          {item.suggestedQuestions} questões sugeridas
        </Button>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-border pt-3">
        {(Object.keys(checklistLabels) as ChecklistKey[]).map((key) => (
          <label key={key} className="flex items-center gap-3 text-sm text-foreground">
            <Checkbox checked={checklist[key]} onCheckedChange={() => toggle(key)} />
            <span className={checklist[key] ? "text-muted-foreground line-through" : ""}>
              {checklistLabels[key]}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
