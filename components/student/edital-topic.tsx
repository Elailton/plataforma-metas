"use client"

import { useId, useState } from "react"
import { CheckCircle2, ChevronDown, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudentTopic } from "@/lib/student/types"

export function topicDisplayTitle(title: string) {
  return title.replace(/^\d+(?:\.\d+)*[\s.)-]+/, "").trim() || title
}

export function EditalTopic({ topic, index }: { topic: StudentTopic; index: number }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const hasSubtopics = topic.subtopics.length > 0

  const header = (
    <div className="flex flex-1 items-center gap-2.5">
      {topic.studied ? (
        <CheckCircle2 className="size-4 shrink-0 text-success" />
      ) : (
        <Circle className="size-4 shrink-0 text-muted-foreground/50" />
      )}
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold tabular-nums text-foreground">
        {index + 1}
      </span>
      <span className={cn("min-w-0 flex-1 text-sm font-medium leading-snug", topic.studied ? "text-foreground" : "text-muted-foreground")}>
        {topicDisplayTitle(topic.title)}
      </span>
      {hasSubtopics ? (
        <>
          <span className="shrink-0 text-xs text-muted-foreground">
            {topic.subtopics.length} subtópico{topic.subtopics.length > 1 ? "s" : ""}
          </span>
          <ChevronDown
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          />
        </>
      ) : null}
    </div>
  )

  return (
    <div className="flex flex-col">
      {hasSubtopics ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {header}
        </button>
      ) : (
        <div className="flex min-h-11 items-center gap-2.5 py-2.5">{header}</div>
      )}

      {hasSubtopics ? (
        <div
          id={panelId}
          className={cn("grid transition-all duration-200 ease-out", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
        >
          <div className="overflow-hidden">
            <ul className="mb-2 ml-3 flex flex-col gap-2.5 border-l border-border py-1 pl-4">
              {topic.subtopics.map((subtopic, subtopicIndex) => (
                <li key={subtopic.id} className="flex items-start gap-2.5">
                  {subtopic.studied ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                  ) : (
                    <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                  )}
                  <span className="text-xs text-muted-foreground/70 font-mono">
                    {index + 1}.{subtopicIndex + 1}
                  </span>
                  <span
                    className={cn("text-sm leading-relaxed", subtopic.studied ? "text-foreground/90" : "text-muted-foreground")}
                  >
                    {topicDisplayTitle(subtopic.title)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
