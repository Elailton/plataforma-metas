import Link from "next/link"
import { ChevronRight, ListChecks, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AdminCourse } from "@/lib/admin/types"

export const COURSE_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
}

export function CourseStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "published" ? "default" : "secondary"} className="shrink-0">
      {COURSE_STATUS_LABEL[status] ?? status}
    </Badge>
  )
}

/** Cartão de curso usado no dashboard e na lista de cursos. */
export function CourseCard({ course }: { course: AdminCourse }) {
  return (
    <Link
      href={`/admin/cursos/${course.id}`}
      className="group flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-[15px] font-semibold leading-snug text-foreground">{course.name}</h3>
          <span className="truncate text-xs text-muted-foreground">{course.organization || "Sem instituição"}</span>
        </div>
        <CourseStatusBadge status={course.status} />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums text-foreground">{course.studentsCount}</span>
            {course.studentsCount === 1 ? "aluno" : "alunos"}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ListChecks className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums text-foreground">{course.goalsCount}</span>
            {course.goalsCount === 1 ? "meta" : "metas"}
          </span>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
