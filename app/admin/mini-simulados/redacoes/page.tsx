import { PageHeader, SectionHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { listAdminCourses } from "@/lib/admin/queries"
import { listAdminEssays } from "@/lib/mini-quizzes/essays"
import { essayReviewDeadline } from "@/lib/mini-quizzes/essay.mjs"
import { formatDateTime } from "@/components/mini-quizzes/format"
import { EssayGradeForm } from "@/components/admin/essay-grade-form"
import { resolveCourse } from "../course-param"

export const dynamic = "force-dynamic"

const STATUS = {
  pending: { label: "Aguardando correção", variant: "secondary" },
  graded: { label: "Corrigida", variant: "default" },
  annulled: { label: "Anulada", variant: "outline" },
} as const

export default async function AdminEssaysPage({ searchParams }: { searchParams: Promise<{ curso?: string }> }) {
  const { curso } = await searchParams
  const courses = await listAdminCourses()
  const course = resolveCourse(courses, curso)
  if (!course) return <PageHeader title="Redações" description="Cadastre um curso primeiro." />
  const essays = await listAdminEssays(course.id)
  const pending = essays.filter((essay) => essay.status === "pending")
  const done = essays.filter((essay) => essay.status !== "pending").reverse()

  return (
    <>
      <PageHeader
        title="Redações dos simulados"
        description={`${course.name}: redações enviadas no Simulado Geral. Prazo informado ao aluno: 7 dias após o envio. As fotos abrem por 1 hora.`}
        backHref={`/admin/mini-simulados?curso=${course.id}`}
        backLabel="Mini Simulados"
      />
      {[
        { id: "pendentes", title: `Aguardando correção (${pending.length})`, list: pending },
        { id: "corrigidas", title: `Corrigidas e anuladas (${done.length})`, list: done },
      ].map(({ id, title, list }) => (
        <section key={id} aria-labelledby={id} className="mb-8">
          <SectionHeader title={<span id={id}>{title}</span>} />
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma redação aqui.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {list.map((essay) => {
                const deadline = essayReviewDeadline(essay.submitted_at)
                const late = essay.status === "pending" && deadline && deadline.getTime() < Date.now()
                return (
                  <li key={essay.id} className="rounded-xl border border-border bg-card p-4 md:p-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{essay.studentName}</span>
                      <Badge variant={STATUS[essay.status].variant}>{STATUS[essay.status].label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {essay.quizTitle} · enviada em {formatDateTime(essay.submitted_at)}
                        {deadline ? ` · prazo ${formatDateTime(deadline.toISOString())}` : ""}
                      </span>
                      {late ? <Badge variant="destructive">Prazo vencido</Badge> : null}
                    </div>
                    {essay.imageUrls.length > 0 ? (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {essay.imageUrls.map((url, index) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Foto ${index + 1} da redação`} className="h-40 w-32 object-cover" />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {essay.body ? (
                      <pre className="mb-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 font-sans text-sm leading-relaxed text-foreground">
                        {essay.body}
                      </pre>
                    ) : null}
                    <EssayGradeForm
                      essayId={essay.id}
                      status={essay.status}
                      scores={essay.scores}
                      feedback={essay.feedback}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ))}
    </>
  )
}
