import Link from "next/link"
import { ArrowRight, CircleCheck } from "lucide-react"
import { SectionHeader } from "@/components/page-header"
import type { DiagnosisSubjectRow, ErrorReportItem } from "@/lib/mini-quizzes/queries"

/** Erros (e questões em branco) organizados por disciplina e assunto, com link para o comentário. */
export function ErrorReport({ items, subjects }: { items: ErrorReportItem[]; subjects: DiagnosisSubjectRow[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
        <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
        Nenhum erro registrado. Quando você fizer um diagnóstico, as questões que errar aparecem aqui para revisar.
      </div>
    )
  }

  const ordered = [...subjects].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const subjectIds = [...ordered.map((subject) => subject.id), null]
  const groups = subjectIds
    .map((subjectId) => {
      const subject = ordered.find((entry) => entry.id === subjectId)
      const list = items.filter((item) => (item.subjectId ?? null) === subjectId || (subjectId === null && !ordered.some((entry) => entry.id === item.subjectId)))
      const topics = new Map<string, ErrorReportItem[]>()
      for (const item of list) {
        const title = subject?.topics.find((topic) => topic.id === item.topicId)?.title ?? "Outros assuntos"
        topics.set(title, [...(topics.get(title) ?? []), item])
      }
      return { id: subjectId ?? "outros", name: subject?.name ?? "Outras disciplinas", total: list.length, topics: [...topics.entries()].sort((a, b) => b[1].length - a[1].length) }
    })
    .filter((group) => group.total > 0)
    .sort((a, b) => b.total - a.total)

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`erros-${group.id}`}>
          <SectionHeader
            title={<span id={`erros-${group.id}`}>{group.name}</span>}
            description={`${group.total} ${group.total === 1 ? "questão para revisar" : "questões para revisar"}`}
          />
          <div className="flex flex-col gap-3">
            {group.topics.map(([topic, list]) => (
              <div key={topic} className="rounded-xl border border-border bg-card">
                <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {topic} <span className="tabular-nums">· {list.length}</span>
                </p>
                <ul className="divide-y divide-border">
                  {list.map((item) => (
                    <li key={`${item.attemptId}-${item.questionId}`} className="flex flex-col gap-1.5 px-4 py-3 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {item.quizTitle} · questão {String(item.number).padStart(2, "0")}
                      </span>
                      <span className="text-foreground">{item.excerpt}</span>
                      <span className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {item.chosenKey ? (
                            <>
                              Você marcou <strong className="text-destructive">{item.chosenKey}</strong>
                            </>
                          ) : (
                            <strong className="text-muted-foreground">Em branco</strong>
                          )}
                          {item.correctKey ? (
                            <>
                              {" "}· correta <strong className="text-success">{item.correctKey}</strong>
                            </>
                          ) : null}
                        </span>
                        <Link
                          href={`/aluno/diagnostico-semanal/tentativas/${item.attemptId}#q-${item.questionId}`}
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          Ver comentário
                          <ArrowRight className="size-3.5" aria-hidden="true" />
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
