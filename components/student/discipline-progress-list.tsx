import { Progress } from "@/components/ui/progress"
import type { StudentSubjectProgress } from "@/lib/student/types"

export function DisciplineProgressList({ subjects }: { subjects: StudentSubjectProgress[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {subjects.map(({ id, name, studied, total, percentage }) => (
        <li key={id} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{name}</span>
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
