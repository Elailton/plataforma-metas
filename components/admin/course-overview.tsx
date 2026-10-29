import Link from "next/link"
import { ArrowRight, BookOpen, CalendarClock, CalendarCheck2, FileText, ListChecks, Users } from "lucide-react"
import { StatCard } from "@/components/stat-card"
import {
  summarizeCourseTimelines,
  summarizeMaterials,
  summarizeStudents,
  type GoalSummary,
} from "@/lib/admin/course-overview.mjs"
import type { AdminCourseStudent, AdminGoal, AdminMaterial } from "@/lib/admin/types"

/** "2026-11-02" -> "seg., 02/11" (data de calendário, sem fuso). */
function formatReleaseDate(date: string | null) {
  if (!date) return "liberada desde o início"
  const [year, month, day] = date.split("-").map(Number)
  const value = new Date(Date.UTC(year, month - 1, day, 12))
  const weekday = value.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })
  return `${weekday} ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`
}

function goalHref(courseId: string, goal: GoalSummary) {
  return `/admin/cursos/${courseId}/metas/${goal.id}`
}

function GoalLink({ courseId, goal, label }: { courseId: string; goal: GoalSummary; label: string }) {
  return (
    <Link
      href={goalHref(courseId, goal)}
      className="group flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:border-primary/60 hover:bg-muted/50"
    >
      <span className="flex min-w-0 flex-col">
        {label ? <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span> : null}
        <span className="truncate text-sm text-foreground">{goal.title}</span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatReleaseDate(goal.dueDate)}</span>
    </Link>
  )
}

export function CourseOverview({
  courseId,
  goals,
  students,
  materials,
  edital,
  today,
}: {
  courseId: string
  goals: AdminGoal[]
  students: AdminCourseStudent[]
  materials: AdminMaterial[]
  edital: { topics: unknown[] }[]
  today: string
}) {
  const timelines = summarizeCourseTimelines(goals, today)
  const studentSummary = summarizeStudents(students)
  const materialSummary = summarizeMaterials(materials)
  const totalTopics = edital.reduce((acc, group) => acc + group.topics.length, 0)
  const published = goals.filter((goal) => goal.status === "published").length
  const drafts = goals.filter((goal) => goal.status === "draft").length
  const lastDate = timelines.map((t) => t.lastDate).filter(Boolean).sort().at(-1) ?? null

  return (
    <div className="flex flex-col gap-4">
      {/* Última meta liberada (por grupo quando as metas são separadas por grupo) */}
      <div className={`grid grid-cols-1 gap-3 md:gap-4 ${timelines.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {timelines.map((timeline) => (
          <section
            key={timeline.group ?? "all"}
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 md:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Última meta liberada{timeline.group ? ` · Grupo ${timeline.group}` : ""}
              </span>
              <CalendarCheck2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>

            {timeline.lastReleased ? (
              <Link
                href={goalHref(courseId, timeline.lastReleased)}
                className="group flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 transition-colors hover:border-primary hover:bg-primary/10"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-lg font-semibold text-foreground">{timeline.lastReleased.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatReleaseDate(timeline.lastReleased.dueDate)} · {timeline.lastReleased.itemCount}{" "}
                    {timeline.lastReleased.itemCount === 1 ? "item" : "itens"}
                  </span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                Nenhuma meta liberada ainda.
              </p>
            )}

            {timeline.next ? <GoalLink courseId={courseId} goal={timeline.next} label="Próxima" /> : null}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
              <span>{timeline.releasedCount} liberadas</span>
              <span>{timeline.scheduledCount} programadas</span>
              {timeline.lastDate ? <span>até {formatReleaseDate(timeline.lastDate)}</span> : null}
            </div>
          </section>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          value={studentSummary.active}
          suffix={`de ${studentSummary.total}`}
          hint={[
            studentSummary.suspended ? `${studentSummary.suspended} suspensos` : null,
            studentSummary.revoked ? `${studentSummary.revoked} revogados` : null,
            studentSummary.neverSignedIn ? `${studentSummary.neverSignedIn} nunca entraram` : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined}
          icon={Users}
        />
        <StatCard
          label="Alunos por grupo"
          value={`${studentSummary.byGroup[1]} · ${studentSummary.byGroup[2]}`}
          suffix="G1 · G2"
          hint={[
            studentSummary.byGroup[3] ? `${studentSummary.byGroup[3]} no Grupo 3 (teste)` : null,
            studentSummary.byGroup.none ? `${studentSummary.byGroup.none} sem grupo` : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined}
          icon={Users}
        />
        <StatCard
          label="Metas publicadas"
          value={published}
          suffix={`de ${goals.length}`}
          hint={[drafts ? `${drafts} em rascunho` : null, lastDate ? `cronograma até ${formatReleaseDate(lastDate)}` : null]
            .filter(Boolean)
            .join(" · ") || undefined}
          icon={ListChecks}
        />
        <StatCard
          label="Tópicos no edital"
          value={totalTopics}
          suffix={`em ${edital.length} disciplinas`}
          icon={BookOpen}
        />
        <StatCard label="Videoaulas" value={materialSummary.videos} icon={FileText} />
        <StatCard label="Cadernos do Qconcursos" value={materialSummary.notebooks} icon={FileText} />
        <StatCard label="Apostilas e PDFs" value={materialSummary.pdfs} icon={FileText} />
        <StatCard
          label="Hoje"
          value={formatReleaseDate(today)}
          hint="Data usada para liberar as metas (horário de Fortaleza)."
          icon={CalendarClock}
        />
      </div>

      {/* Próximas metas de cada grupo */}
      {timelines.some((timeline) => timeline.upcoming.length > 1) ? (
        <div className={`grid grid-cols-1 gap-3 md:gap-4 ${timelines.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {timelines.map((timeline) =>
            timeline.upcoming.length > 1 ? (
              <section key={timeline.group ?? "all"} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 md:p-5">
                <span className="text-xs font-medium text-muted-foreground">
                  Próximas liberações{timeline.group ? ` · Grupo ${timeline.group}` : ""}
                </span>
                {timeline.upcoming.map((goal) => (
                  <GoalLink key={goal.id} courseId={courseId} goal={goal} label="" />
                ))}
              </section>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  )
}
