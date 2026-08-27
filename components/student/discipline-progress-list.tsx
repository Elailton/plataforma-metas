import { Progress } from "@/components/ui/progress"
import { getDisciplineProgressList } from "@/lib/mock-data"

export function DisciplineProgressList({ courseId }: { courseId: string }) {
  const list = getDisciplineProgressList(courseId)

  return (
    <ul className="flex flex-col gap-4">
      {list.map(({ discipline, studied, total, percentage }) => (
        <li key={discipline.id} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{discipline.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {studied}/{total} tópicos
            </span>
          </div>
          <Progress value={percentage} className="h-1.5" />
        </li>
      ))}
    </ul>
  )
}
