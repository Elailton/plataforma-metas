import { Progress } from "@/components/ui/progress"
import type { StudentSubjectProgress } from "@/lib/student/types"

export function DisciplineProgressList({ subjects }: { subjects: StudentSubjectProgress[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {subjects.map(({ id, name, studied, total, percentage }) => (
        <li key={id} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-sm font-medium leading-snug text-foreground">{name}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {studied}/{total}
            </span>
          </div>
          <Progress value={percentage} className="h-1.5" aria-label={`${name}: ${percentage}%`} />
        </li>
      ))}
    </ul>
  )
}
