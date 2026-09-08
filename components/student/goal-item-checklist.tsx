"use client"

import { useState, useTransition } from "react"
import { ExternalLink, FileText, PlayCircle, HelpCircle, CheckCircle2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { setGoalItemCompleted } from "@/lib/student/actions"
import type { StudentGoalItem } from "@/lib/student/types"

export function GoalItemChecklist({ item }: { item: StudentGoalItem }) {
  const [isComplete, setIsComplete] = useState(item.completed)
  const [pending, startTransition] = useTransition()

  function toggle(completed: boolean) {
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

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-primary">{item.subjectName}</span>
          <h3 className="text-sm font-semibold leading-snug text-foreground">
            {item.topicName ?? "Item de estudo"}
          </h3>
        </div>
        {isComplete ? (
          <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-medium text-success">
            <CheckCircle2 className="size-3.5" />
            Concluído
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Pendente</span>
        )}
      </div>

      {item.instructions ? <p className="text-sm leading-relaxed text-muted-foreground">{item.instructions}</p> : null}

      <div className="flex flex-wrap gap-2">
        {item.materials.map((material) => (
          <Button
            key={material.id}
            className={material.type === "apostila" ? "material-apostila" : material.type === "videoaula" ? "material-videoaula" : undefined}
            render={<a href={material.url} target="_blank" rel="noreferrer" />}
            nativeButton={false}
            size="sm"
            variant="outline"
          >
            {material.type === "apostila" ? <FileText data-icon="inline-start" /> : material.type === "videoaula" ? <PlayCircle data-icon="inline-start" /> : <ExternalLink data-icon="inline-start" />}
            {material.title}
          </Button>
        ))}
        {item.suggestedQuestions ? <Button size="sm" variant="outline" disabled>
          <HelpCircle data-icon="inline-start" />
          {item.suggestedQuestions} questões sugeridas
        </Button> : null}
      </div>

      <div className="border-t border-border pt-3">
        <label className="flex items-center gap-3 text-sm font-medium text-foreground">
          <Checkbox
            checked={isComplete}
            disabled={pending}
            onCheckedChange={(checked) => toggle(checked === true)}
          />
          <span className={isComplete ? "text-muted-foreground line-through" : ""}>Item concluído</span>
        </label>
      </div>
    </div>
  )
}

