import { Progress } from "@/components/ui/progress"
import { getDisciplineProgressList } from "@/lib/mock-data"

export function CourseEditalSummary({ courseId }: { courseId: string }) {
  const list = getDisciplineProgressList(courseId)

  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
      {list.map(({ discipline, studied, total, percentage }) => (
        <div key={discipline.id} className="flex flex-col gap-1.5 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{discipline.name}</span>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {studied}/{total} tópicos · {percentage}%
            </span>
          </div>
          <Progress value={percentage} className="h-1.5" />
        </div>
      ))}
    </div>
  )
}
